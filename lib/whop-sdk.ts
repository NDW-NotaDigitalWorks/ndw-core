// lib/whop-sdk.ts
import { Whop } from "@whop/sdk";

function must(name: string, v?: string) {
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

// ? ESPORTAZIONE CORRETTA PER NEXT.JS 16.1.3
export const whop = new Whop({
  apiKey: must("WHOP_API_KEY", process.env.WHOP_API_KEY),
  // Whop SDK expects base64 for webhookKey in standard webhooks verification.
  webhookKey: btoa(must("WHOP_WEBHOOK_SECRET", process.env.WHOP_WEBHOOK_SECRET)),
});

// ? ESPORTAZIONE RETROCOMPATIBILE (opzionale)
export const whopsdk = whop;
