// lib/routepro/flexTextParser.ts

export type FlexParsedStop = {
  stop_index: number;
  address: string;
  city: string | null;
  packages: number | null;
  delivery_window: string | null; // "08:30 - 17:30"
};

function normalizeLine(s: string) {
  return s
    .replace(/\u2022/g, " ") // bullet •
    .replace(/\s+/g, " ")
    .trim();
}

function isStopHeader(line: string) {
  const l = line.toLowerCase();
  return l.includes("n.") && l.includes("consegna");
}

function extractWindowFromHeader(line: string): string | null {
  const m = line.match(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
  if (!m) return null;
  return `${m[1]} - ${m[2]}`;
}

function extractPackages(line: string): number | null {
  // "Consegna 1 pacco" / "Consegna 4 pacchi"
  const m = line.toLowerCase().match(/consegna\s+(\d+)\s+pacc/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

export function parseFlexStops(raw: string): FlexParsedStop[] {
  const lines = raw
    .split(/\r?\n/)
    .map(normalizeLine)
    .filter((l) => l.length > 0);

  const chunks: string[][] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (isStopHeader(line)) {
      if (current.length > 0) chunks.push(current);
      current = [line];
    } else {
      if (current.length === 0) continue; // ignora rumore iniziale
      current.push(line);
    }
  }
  if (current.length > 0) chunks.push(current);

  const out: FlexParsedStop[] = [];

  chunks.forEach((chunk, idx) => {
    const header = chunk[0] ?? "";
    const delivery_window = extractWindowFromHeader(header);

    const body = chunk.slice(1);

    const pkgIndex = body.findIndex((l) => extractPackages(l) != null);
    const packages = pkgIndex >= 0 ? extractPackages(body[pkgIndex]) : null;

    let city: string | null = null;
    let cityLineIndex = -1;

    if (pkgIndex >= 0) {
      cityLineIndex = pkgIndex - 1;
      city = cityLineIndex >= 0 ? body[cityLineIndex] : null;
    } else if (body.length > 0) {
      cityLineIndex = body.length - 1;
      city = body[cityLineIndex];
    }

    const addrLines =
      cityLineIndex >= 0 ? body.slice(0, cityLineIndex) : body.slice();

    const address = normalizeLine(addrLines.join(" "));

    out.push({
      stop_index: idx + 1,
      address,
      city: city ? normalizeLine(city) : null,
      packages,
      delivery_window,
    });
  });

  // scarta stop “vuoti” (es. OCR incolla righe strane)
  return out.filter((s) => s.address.length > 0);
}
