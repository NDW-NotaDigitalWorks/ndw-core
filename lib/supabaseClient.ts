// lib/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

/**
 * NDW Supabase client (public/anon).
 * NOTE: Uses NEXT_PUBLIC_* env vars so it can be used in the browser.
 * Do NOT put service_role key here.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // This error helps during local setup if .env.local is missing.
  throw new Error(
    "Missing Supabase env vars. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
