import type { CapacitorConfig } from "@capacitor/cli";

const serverUrl = process.env.CAP_SERVER_URL?.trim() || "https://app.individuaula.workers.dev";

const config: CapacitorConfig = {
  appId: "br.edu.aedb.individuaula",
  appName: "IndividuAula",
  webDir: "mobile-web",
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith("http://"),
  },
  plugins: {
    SystemBars: {
      style: "DARK",
      insetsHandling: "css",
    },
  },
};

export default config;
