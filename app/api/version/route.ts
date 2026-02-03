// app/api/version/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  // Su Vercel questa env spesso esiste; se non esiste usiamo un fallback.
  const version =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.VERCEL_DEPLOYMENT_ID ||
    "dev";

  return NextResponse.json(
    { version },
    {
      headers: {
        // Evita cache lato client/proxy
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
