import { getServices } from "@/server/services";

// divulga apenas a chave pública para o widget, sem expor o segredo do servidor.
export async function GET() {
  const config = getServices().turnstile;
  return Response.json({ siteKey: config?.siteKey ?? null }, { headers: { "Cache-Control": "no-store" } });
}
