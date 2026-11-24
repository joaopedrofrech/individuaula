// envia mensagens transacionais pela API do Resend sem expor a chave ao navegador.
export async function sendEmail(config: { apiKey: string; from: string }, message: { to: string; subject: string; text: string }) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: config.from, ...message }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Falha no envio de e-mail (${response.status})`);
}
