import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

/**
 * Browser-only Supabase client for App Router Client Components.
 * The publishable/anon key is safe to expose; never put service_role here.
 */
export function createClient(): SupabaseClient {
  if (typeof window === "undefined") {
    throw new Error("Supabase browser client may only be used in the browser.");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or legacy NEXT_PUBLIC_SUPABASE_ANON_KEY) in apps/dashboard/.env.local.");
  }

  if (!browserClient) {
    browserClient = createSupabaseClient(url, key, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
      global: {
        headers: { "X-Client-Info": "resellerku-owner-dashboard/1.0.0" },
      },
    });
  }

  return browserClient;
}
