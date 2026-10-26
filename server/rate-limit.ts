type Bucket = { count: number; resetAt: number };

type RateLimiterOptions = {
  limit: number;
  windowMs: number;
  now?: () => number;
};

// limita tentativas por chave dentro de uma janela fixa; o estado vive na instância do worker.
export function createRateLimiter({ limit, windowMs, now = () => Date.now() }: RateLimiterOptions) {
  const buckets = new Map<string, Bucket>();

  return {
    // registra uma tentativa e informa se ela ainda cabe no limite.
    check(key: string) {
      const current = now();
      const bucket = buckets.get(key);
      if (!bucket || bucket.resetAt <= current) {
        buckets.set(key, { count: 1, resetAt: current + windowMs });
        return { allowed: true, retryAfterSeconds: 0 };
      }
      bucket.count += 1;
      if (bucket.count > limit) {
        return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - current) / 1000)) };
      }
      return { allowed: true, retryAfterSeconds: 0 };
    },
    // descarta contadores já vencidos para a memória não crescer sem limite.
    prune() {
      const current = now();
      for (const [key, bucket] of buckets) {
        if (bucket.resetAt <= current) {
          buckets.delete(key);
        }
      }
    },
    reset() {
      buckets.clear();
    },
  };
}

// identifica o cliente pelo cabeçalho que a Cloudflare preenche; cai para o proxy padrão em desenvolvimento.
export function clientKey(request: Request) {
  return request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}

export const loginLimiter = createRateLimiter({ limit: 10, windowMs: 60_000 });
export const registerLimiter = createRateLimiter({ limit: 5, windowMs: 60_000 });
export const searchLimiter = createRateLimiter({ limit: 30, windowMs: 60_000 });

export function resetRateLimiters() {
  loginLimiter.reset();
  registerLimiter.reset();
  searchLimiter.reset();
}
