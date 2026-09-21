import { profileSchema, registrationSchema, loginSchema, type LoginInput, type ProfileInput, type RegistrationInput } from "@/lib/validators";
import { createSession, getValidSession, revokeSession } from "@/lib/session";
import type { User } from "@/lib/types";

type StoredUser = User & { passwordHash: string };
type ResetRequest = { userId: string; expiresAt: Date; used: boolean };

const encoder = new TextEncoder();

// gera um hash demonstrativo sem devolver a credencial ao cliente.
async function hashPassword(password: string, salt = crypto.randomUUID()) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(`${salt}:${password}`));
  const bytes = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${salt}:${bytes}`;
}

async function comparePassword(password: string, storedHash: string) {
  // refaz o hash com o salt salvo para comparar sem expor a senha original.
  const [salt] = storedHash.split(":");
  return (await hashPassword(password, salt)) === storedHash;
}

export function createAuthService({ seed = true }: { seed?: boolean } = {}) {
  // cria o serviço de autenticação isolado para facilitar a troca por uma persistência real.
  const users = new Map<string, StoredUser>();
  const resets = new Map<string, ResetRequest>();

  if (seed) {
    // prepara uma conta demonstrativa somente quando o serviço é inicializado com seed.
    void (async () => {
      const now = new Date();
      users.set("demo-user", {
        id: "demo-user",
        name: "Aluno IndividuAula",
        email: "demo@individuaula.local",
        createdAt: now,
        passwordHash: await hashPassword("individuaula"),
      });
    })();
  }

  return {
    // valida e registra uma conta nova na memória do serviço.
    async register(input: RegistrationInput) {
      const data = registrationSchema.parse(input);
      const normalizedEmail = data.email.toLowerCase();
      if ([...users.values()].some((user) => user.email === normalizedEmail)) {
        throw new Error("E-mail já cadastrado.");
      }

      const user: StoredUser = {
        id: `user-${crypto.randomUUID()}`,
        name: data.name,
        email: normalizedEmail,
        createdAt: new Date(),
        passwordHash: await hashPassword(data.password),
      };
      users.set(user.id, user);
      return { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt };
    },

    // valida as credenciais e cria uma sessão com validade limitada.
    async login(input: LoginInput) {
      const data = loginSchema.parse(input);
      const user = [...users.values()].find((item) => item.email === data.email.toLowerCase());
      if (!user || !(await comparePassword(data.password, user.passwordHash))) {
        throw new Error("Credenciais inválidas.");
      }

      const session = createSession({ userId: user.id, expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 8) });
      return { user: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt }, session };
    },

    // cria uma solicitação neutra para não revelar se o e-mail existe.
    async requestPasswordReset(input: { email: string }) {
      const email = input.email.trim().toLowerCase();
      const user = [...users.values()].find((item) => item.email === email);
      const requestId = crypto.randomUUID();
      if (user) {
        resets.set(requestId, { userId: user.id, expiresAt: new Date(Date.now() + 1000 * 60 * 30), used: false });
      }
      return { accepted: true, requestId };
    },

    // troca a senha somente quando o token ainda está válido e não foi usado.
    async resetPassword(input: { requestId: string; password: string }) {
      const reset = resets.get(input.requestId);
      if (!reset || reset.used || reset.expiresAt.getTime() <= Date.now()) {
        throw new Error("Token inválido, expirado ou já utilizado.");
      }
      const user = users.get(reset.userId);
      if (!user) {
        throw new Error("Usuário não encontrado.");
      }
      user.passwordHash = await hashPassword(input.password);
      reset.used = true;
    },

    // atualiza os dados básicos sem permitir conflito de e-mail.
    async updateProfile(userId: string, input: ProfileInput) {
      const data = profileSchema.parse(input);
      const user = users.get(userId);
      if (!user) {
        throw new Error("Usuário não encontrado.");
      }
      const duplicate = [...users.values()].some((item) => item.id !== userId && item.email === data.email);
      if (duplicate) {
        throw new Error("E-mail já cadastrado.");
      }
      user.name = data.name;
      user.email = data.email;
      return { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt };
    },

    // recupera usuário e sessão para proteger as rotas que dependem de login.
    async getSession(sessionId: string) {
      const session = await getValidSession(sessionId);
      if (!session) {
        return null;
      }
      const user = users.get(session.userId);
      if (!user) {
        return null;
      }
      return { session, user: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt } };
    },

    // invalida a sessão atual para encerrar o acesso imediatamente.
    async logout(sessionId: string) {
      revokeSession(sessionId);
    },
  };
}

export const authService = createAuthService({ seed: false });
