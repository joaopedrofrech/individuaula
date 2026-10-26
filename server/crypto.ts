const encoder = new TextEncoder();

// PBKDF2 é o derivador de senha nativo do WebCrypto; 100 mil iterações é o teto aceito pelo Workers.
export const HASH_ITERATIONS = 100_000;

function toHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// gera um valor aleatório criptograficamente seguro, em hexadecimal.
export function randomHex(byteLength: number) {
  return toHex(crypto.getRandomValues(new Uint8Array(byteLength)));
}

// SHA-256 serve para tokens aleatórios de 256 bits (sessão, confirmação, recuperação): não precisam de hash lento.
export async function sha256Hex(value: string) {
  return toHex(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))));
}

// deriva o hash lento da senha com sal individual, sem devolver a credencial ao cliente.
export async function hashPassword(password: string, salt = randomHex(16)) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: encoder.encode(salt), iterations: HASH_ITERATIONS },
    key,
    256,
  );
  return `pbkdf2$${salt}$${toHex(new Uint8Array(bits))}`;
}

// compara em tempo constante para não revelar quantos caracteres do hash coincidem.
export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return diff === 0;
}

export async function comparePassword(password: string, storedHash: string) {
  // refaz o hash com o sal salvo para comparar sem expor a senha original.
  const [, salt] = storedHash.split("$");
  return safeEqual(await hashPassword(password, salt), storedHash);
}
