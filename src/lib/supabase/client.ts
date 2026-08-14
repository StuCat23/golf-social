import { createBrowserClient } from "@supabase/ssr";

// Used in client components only. Reads the publishable key
// (sb_publishable_..., replaces the legacy anon key), which is
// safe to expose — RLS policies do the actual gatekeeping.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}