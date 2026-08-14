import { createBrowserClient } from "@supabase/ssr";

// Used in client components only. Reads the public anon key,
// which is safe to expose - RLS policies do the actual gatekeeping
export function createClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
}