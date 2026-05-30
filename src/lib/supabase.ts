import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const env = import.meta.env as Record<string, string | undefined>;

const SUPABASE_URL = env.VITE_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY =
  env.VITE_SUPABASE_ANON_KEY ??
  env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error(
    "Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.",
  );
}

const externalSupabase: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QueryData = any;

type QueryResult = {
  data: QueryData;
  error: { message: string } | null;
  count?: number | null;
};

type LooseQueryBuilder = PromiseLike<QueryResult> & {
  select: (...args: unknown[]) => LooseQueryBuilder;
  insert: (...args: unknown[]) => LooseQueryBuilder;
  upsert: (...args: unknown[]) => LooseQueryBuilder;
  update: (...args: unknown[]) => LooseQueryBuilder;
  eq: (...args: unknown[]) => LooseQueryBuilder;
  order: (...args: unknown[]) => LooseQueryBuilder;
  limit: (...args: unknown[]) => LooseQueryBuilder;
  maybeSingle: (...args: unknown[]) => PromiseLike<QueryResult>;
  single: (...args: unknown[]) => PromiseLike<QueryResult>;
};

type LooseSupabaseClient = Omit<SupabaseClient, "from"> & {
  from: (relation: string) => LooseQueryBuilder;
};

export const supabase = externalSupabase as unknown as LooseSupabaseClient;
export const supabaseRaw = externalSupabase;
