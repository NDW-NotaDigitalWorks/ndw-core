import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const url = req.nextUrl;

  // Se arriva da routepro.notadigitalworks.com (o routepro.*)
  if (host.startsWith("routepro.")) {
    // Redirect canonico al path /routepro sul dominio principale
    const target = new URL("https://notadigitalworks.com/routepro");
    return NextResponse.redirect(target, 308);
  }

  return NextResponse.next();
}

// Evita di applicare il middleware a statici e API
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
