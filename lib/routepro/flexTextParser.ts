// lib/routepro/flexTextParser.ts
export type FlexParsedStop = {
  stop_index: number;
  address: string;
  city: string | null;
  packages: number | null;
  delivery_window: string | null; // "08:30 - 17:30"
  stop_kind: "delivery" | "pickup"; // MVP: delivery + pickup (ritira)
};

function cleanLine(raw: string): string {
  return raw
    .replace(/\u200B/g, "")
    .replace(/[•·]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isNoiseLine(line: string): boolean {
  if (!line) return true;
  const lower = line.toLowerCase();

  // parole/etichette OCR che non servono
  if (lower === "posizioni") return true;

  // numeri singoli o piccoli token isolati tipici OCR
  if (/^\(?\d{1,3}\)?$/.test(lower)) return true;

  // caratteri strani singoli
  if (/^[^\w\d]{1,3}$/.test(line)) return true;

  return false;
}

function normalizeCity(city: string): string {
  const s = city
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  // Title Case semplice
  return s
    .split(" ")
    .filter(Boolean)
    .map((w) => w.length ? w[0].toUpperCase() + w.slice(1) : w)
    .join(" ");
}

function extractWindow(line: string): string | null {
  // gestisce "08:30 - 17:30" e anche "08:30. 18:30" ecc
  const m = line.match(/(\d{1,2}:\d{2})\s*[-–\.]\s*(\d{1,2}:\d{2})/);
  if (!m) return null;
  const a = m[1].padStart(5, "0");
  const b = m[2].padStart(5, "0");
  return `${a} - ${b}`;
}

function extractPackages(line: string): number | null {
  const lower = line.toLowerCase();

  // Consegna 4 pacchi / Consegna 1 pacco
  let m = lower.match(/consegna\s+(\d+)\s+pacc/);
  if (m) return Number(m[1]);

  // Ritira 1 collo / Ritira 2 colli
  m = lower.match(/ritira\s+(\d+)\s+coll/);
  if (m) return Number(m[1]);

  return null;
}

function isHeaderLine(line: string): boolean {
  const lower = line.toLowerCase();
  // "N. C22-2G • Consegna ..." / "N. ... • Programmato ..." / "N. ... • Ritira ..."
  return lower.includes("n.") && (lower.includes("consegna") || lower.includes("programmato") || lower.includes("ritira"));
}

function headerKind(line: string): "delivery" | "pickup" {
  const lower = line.toLowerCase();
  if (lower.includes("ritira")) return "pickup";
  return "delivery";
}

export function parseFlexStops(rawText: string): FlexParsedStop[] {
  if (!rawText || !rawText.trim()) return [];

  // 1) linee pulite + filtro rumore
  const lines = rawText
    .split(/\r?\n/)
    .map(cleanLine)
    .filter((l) => !isNoiseLine(l));

  // 2) segmentazione in blocchi: ogni blocco parte da header
  const blocks: string[][] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (isHeaderLine(line)) {
      if (current.length) blocks.push(current);
      current = [line];
    } else {
      if (!current.length) continue; // ignora fino al primo header
      current.push(line);
    }
  }
  if (current.length) blocks.push(current);

  // 3) parsing blocchi
  const stops: FlexParsedStop[] = [];
  let idx = 1;

  for (const b of blocks) {
    const header = b[0];
    const kind = headerKind(header);

    // window (può stare nell'header o in righe successive)
    let window: string | null = extractWindow(header);

    // packages (può stare più sotto)
    let packages: number | null = null;

    // addressLines: riga/e successive fino a city
    const body = b.slice(1);

    // prova a trovare packages e window anche nel body
    for (const line of body) {
      if (!window) {
        const w = extractWindow(line);
        if (w) window = w;
      }
      if (packages == null) {
        const p = extractPackages(line);
        if (p != null) packages = p;
      }
    }

    // city: euristica MVP = prima riga "solo testo" dopo almeno una address line
    // In pratica: di solito è la riga dopo l'indirizzo.
    let city: string | null = null;
    const addressParts: string[] = [];

    for (const line of body) {
      const lower = line.toLowerCase();

      // ignora righe "Consegna X pacchi", "Ritira X colli"
      if (lower.startsWith("consegna") || lower.startsWith("ritira")) continue;

      // la prima riga che sembra "città" (no numeri, no virgole strane) dopo almeno 1 address part
      const looksLikeCity =
        addressParts.length > 0 &&
        /^[a-zàèéìòù\s'’-]+$/i.test(line) &&
        line.length <= 40;

      if (!city && looksLikeCity) {
        city = normalizeCity(line);
        continue;
      }

      // accumula address
      if (!city) addressParts.push(line);
      else {
        // dopo che city è stata trovata, ignora resto (di solito non serve)
      }
    }

    const address = addressParts.join(" ").replace(/\s+/g, " ").trim();

    // se city non trovata ma abbiamo address con "ROBBIANO DI GIUSSANO" ecc su una riga:
    if (!city && addressParts.length >= 2) {
      // fallback: ultima riga come city se sembra city
      const last = addressParts[addressParts.length - 1];
      if (/^[a-zàèéìòù\s'’-]+$/i.test(last) && last.length <= 40) {
        city = normalizeCity(last);
        addressParts.pop();
      }
    }

    const finalAddress = addressParts.join(" ").replace(/\s+/g, " ").trim();

    if (!finalAddress) {
      // se OCR è troppo sporco, skippa blocco vuoto
      continue;
    }

    stops.push({
      stop_index: idx++,
      address: finalAddress,
      city,
      packages,
      delivery_window: window,
      stop_kind: kind,
    });
  }

  return stops;
}
