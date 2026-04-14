import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const missingEnvMessage =
  "Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)";

function createMissingEnvProxy(): SupabaseClient {
  return new Proxy(
    {},
    {
      get() {
        throw new Error(missingEnvMessage);
      },
    }
  ) as SupabaseClient;
}

export const supabase: SupabaseClient =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : createMissingEnvProxy();
