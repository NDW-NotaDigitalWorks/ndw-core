// app/api/webhooks/whop/route.ts
import { NextRequest } from "next/server";
import { whopsdk } from "@/lib/whop-sdk";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type WhopWebhook = {
  id: string;
  api_version: "v1";
  timestamp: string;
  type: string;
  data: any;
  company_id?: string | null;
};

function productIdToProductCode(productId?: string | null): string | null {
  const routeProStarterId = process.env.WHOP_ROUTEPRO_STARTER_PRODUCT_ID;

  if (productId && routeProStarterId && productId === routeProStarterId) {
    return "routepro-starter";
  }

  return null;
}

async function getUserIdByEmail(email: string): Promise<string | null> {
  const normalized = email.toLowerCase().trim();

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("user_id")
    .eq("email", normalized)
    .maybeSingle();

  if (error) throw error;
  return data?.user_id ?? null;
}

async function upsertEntitlement(params: {
  userId: string;
  productCode: string;
  status: "active" | "inactive" | "cancelled";
  externalCustomerId?: string | null;
  externalSubscriptionId?: string | null;
  endsAt?: string | null;
}) {
  const { error } = await supabaseAdmin.from("entitlements").upsert(
    {
      user_id: params.userId,
      product_code: params.productCode,
      status: params.status,
      source: "whop",
      external_customer_id: params.externalCustomerId ?? null,
      external_subscription_id: params.externalSubscriptionId ?? null,
      ends_at: params.endsAt ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,product_code" }
  );

  if (error) throw error;
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const requestBodyText = await request.text();
    const headers = Object.fromEntries(request.headers);

    // Verify + parse webhook
    const webhookData = whopsdk.webhooks.unwrap(requestBodyText, { headers }) as WhopWebhook;

    // Only membership events for access control
    if (
      webhookData.type !== "membership.activated" &&
      webhookData.type !== "membership.deactivated" &&
      webhookData.type !== "membership.cancel_at_period_end_changed"
    ) {
      return new Response("OK", { status: 200 });
    }

    const membership = webhookData.data;

    const email: string | undefined = membership?.user?.email;
    const membershipId: string | undefined = membership?.id; // mem_xxx
    const productId: string | undefined = membership?.product?.id; // prod_xxx
    const productTitle: string | undefined = membership?.product?.title;

    if (!email) return new Response("Missing user.email", { status: 200 });

    const productCode = productIdToProductCode(productId);
    if (!productCode) {
      console.log("[WHOP] Unmapped product:", productId, productTitle);
      return new Response("OK", { status: 200 });
    }

    const userId = await getUserIdByEmail(email);
    if (!userId) {
      console.log("[WHOP] No NDW user found for email:", email);
      // Return 200 to avoid retries: user may sign up later.
      return new Response("OK", { status: 200 });
    }

    if (webhookData.type === "membership.activated") {
      await upsertEntitlement({
        userId,
        productCode,
        status: "active",
        externalCustomerId: membership?.user?.id ?? null, // user_xxx
        externalSubscriptionId: membershipId ?? null,
        endsAt: membership?.renewal_period_end ?? null,
      });
      return new Response("OK", { status: 200 });
    }

    if (webhookData.type === "membership.deactivated") {
      await upsertEntitlement({
        userId,
        productCode,
        status: "inactive",
        externalCustomerId: membership?.user?.id ?? null,
        externalSubscriptionId: membershipId ?? null,
        endsAt: membership?.renewal_period_end ?? null,
      });
      return new Response("OK", { status: 200 });
    }

    // cancel_at_period_end_changed: keep active, store ends_at
    if (webhookData.type === "membership.cancel_at_period_end_changed") {
      const cancelAtPeriodEnd = !!membership?.cancel_at_period_end;

      await upsertEntitlement({
        userId,
        productCode,
        status: "active",
        externalCustomerId: membership?.user?.id ?? null,
        externalSubscriptionId: membershipId ?? null,
        endsAt: cancelAtPeriodEnd ? (membership?.renewal_period_end ?? null) : null,
      });

      return new Response("OK", { status: 200 });
    }

    return new Response("OK", { status: 200 });
  } catch (e: any) {
    console.error("[WHOP WEBHOOK ERROR]", e?.message ?? e);
    return new Response("Bad Request", { status: 400 });
  }
}
