import { eq } from "drizzle-orm";
import { sessions, users } from "@/db/schema";
import type { User } from "@/lib/types";
import { loginSchema, registrationSchema, updateProfileSchema } from "@/lib/validators";
import { comparePassword, hashPassword, randomHex, sha256Hex } from "@/server/crypto";
import type { Db } from "@/server/db";

export type AuthErrorCode = "INVALID_CREDENTIALS" | "EMAIL_TAKEN" | "NOT_FOUND";

const STATUS: Record<AuthErrorCode, number> = {
  INVALID_CREDENTIALS: 401,
  EMAIL_TAKEN: 409,
  NOT_FOUND: 404,
};

export class AuthError extends Error {
  readonly status: number;
  constructor(readonly code: AuthErrorCode, message: string) {
    super(message);
    this.status = STATUS[code];
  }
}

export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

type AuthServiceOptions = { db: Db; now?: () => Date };

type UserRow = typeof users.$inferSelect;

// o hash da senha nunca sai daqui: o resto do app só enxerga estes campos.
const toUser = (row: UserRow): User => ({ id: row.id, name: row.name, email: row.email, createdAt: row.createdAt });

// hash fixo para que o login de um e-mail inexistente gaste o mesmo tempo de um existente.
let decoyHash: Promise<string> | undefined;
const getDecoyHash = () => (decoyHash ??= hashPassword("senha-inexistente", "0".repeat(32)));

export function createAuthService({ db, now = () => new Date() }: AuthServiceOptions) {
  async function findByEmail(email: string) {
    const [row] = await db.select().from(users).where(eq(users.email, email.trim().toLowerCase())).limit(1);
    return row;
  }

  // o token cru só existe no cookie do navegador; o banco guarda apenas o hash dele.
  async function createSession(userId: string) {
    const token = randomHex(32);
    const createdAt = now();
    const expiresAt = new Date(createdAt.getTime() + SESSION_TTL_MS);
    await db.insert(sessions).values({ id: await sha256Hex(token), userId, createdAt, expiresAt });
    return { token, expiresAt };
  }

  return {
    // cadastra a conta com a senha já em hash; o e-mail é único, então a restrição do banco decide corridas.
    async register(input: unknown) {
      const data = registrationSchema.parse(input);
      const email = data.email.toLowerCase();
      if (await findByEmail(email)) {
        throw new AuthError("EMAIL_TAKEN", "E-mail já cadastrado.");
      }

      const timestamp = now();
      const row: UserRow = {
        id: `user-${crypto.randomUUID()}`,
        name: data.name,
        email,
        passwordHash: await hashPassword(data.password),
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      try {
        await db.insert(users).values(row);
      } catch {
        // duas requisições simultâneas com o mesmo e-mail: a restrição UNIQUE do banco decide.
        throw new AuthError("EMAIL_TAKEN", "E-mail já cadastrado.");
      }
      return toUser(row);
    },

    // confere as credenciais e abre uma sessão; senha errada e e-mail inexistente dão a mesma resposta.
    async login(input: unknown) {
      const data = loginSchema.parse(input);
      const row = await findByEmail(data.email);
      const matches = await comparePassword(data.password, row?.passwordHash ?? (await getDecoyHash()));
      if (!row || !matches) {
        throw new AuthError("INVALID_CREDENTIALS", "Credenciais inválidas.");
      }
      return { user: toUser(row), ...(await createSession(row.id)) };
    },

    // devolve o usuário dono do token de sessão, removendo sessões vencidas.
    async getSession(token: string) {
      const id = await sha256Hex(token);
      const [found] = await db.select({ user: users, expiresAt: sessions.expiresAt }).from(sessions).innerJoin(users, eq(users.id, sessions.userId)).where(eq(sessions.id, id)).limit(1);
      if (!found) {
        return null;
      }
      if (found.expiresAt.getTime() <= now().getTime()) {
        await db.delete(sessions).where(eq(sessions.id, id));
        return null;
      }
      return toUser(found.user);
    },

    async logout(token: string) {
      await db.delete(sessions).where(eq(sessions.id, await sha256Hex(token)));
    },

    // por ora só o nome pode mudar; o e-mail identifica a conta.
    async updateProfile(userId: string, input: unknown) {
      const data = updateProfileSchema.parse(input);
      const [row] = await db.update(users).set({ name: data.name, updatedAt: now() }).where(eq(users.id, userId)).returning();
      if (!row) {
        throw new AuthError("NOT_FOUND", "Usuário não encontrado.");
      }
      return toUser(row);
    },
  };
}
