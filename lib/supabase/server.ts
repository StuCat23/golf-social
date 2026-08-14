import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Used in Server Actions and Server Components
// Reads the user's session from cookies so RLS policies work correctly on inserts
export async function createClient() {
    const cookieStore = await cookies();

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) => 
                            cookiesStore.set(name, value, options)
                        );  
                    } catch {
                        // Called from a Server Component with no writable cookie
                        // store — safe to ignore if you have middleware refreshing
                        // sessions elsewhere.
                    }
                },
            },
        }
    );
}