// 📁 lib/ceo-access.ts - CREA QUESTO FILE
// REGOLA UNICA: GLI EMAIL IN QUESTA LISTA SONO ELITE PER SEMPRE
// NIENTE DB, NIENTE COUPON, NIENTE WHOP - SOLO QUESTA LISTA

export const CEO_EMAILS = [
  'la.tua@email.com',     // 🚀 TU (CEO NDW)
  // 'collaboratore@email.com', // Per futuri collaboratori
] as const;

export type CEOTier = 'routepro_elite';

// Funzione SINGOLA per verificare accesso CEO
export function getCEOTier(email: string | null | undefined): 'routepro_elite' | null {
  if (!email) return null;
  return CEO_EMAILS.includes(email as any) ? 'routepro_elite' : null;
}

// Funzione per controllare se è CEO
export function isCEO(email: string | null | undefined): boolean {
  if (!email) return false;
  return CEO_EMAILS.includes(email as any);
}

// Override FORZATO - Questo va chiamato OGNI VOLTA che si legge il tier
export function overrideWithCEOTier(email: string | null | undefined, currentTier: string): string {
  if (!email) return currentTier;
  if (CEO_EMAILS.includes(email as any)) {
    return 'routepro_elite';
  }
  return currentTier;
}