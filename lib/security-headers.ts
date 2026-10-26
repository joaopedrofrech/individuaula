// monta os cabeçalhos de segurança aplicados a todas as rotas; o `unsafe-eval` só existe no desenvolvimento.
export function buildSecurityHeaders({ isDev = false }: { isDev?: boolean } = {}) {
  const contentSecurityPolicy = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://i.ytimg.com https://*.ytimg.com",
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");

  return [
    { key: "Content-Security-Policy", value: contentSecurityPolicy },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  ];
}

// respostas da API trazem dados pessoais e o estado da sessão; `no-store` impede o navegador (inclusive no botão "voltar")
// de guardar uma cópia e mostrá-la depois do logout ou para outra pessoa no mesmo computador.
export function buildApiHeaders() {
  return [{ key: "Cache-Control", value: "no-store" }];
}
