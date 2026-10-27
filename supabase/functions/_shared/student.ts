import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.118.0';

/**
 * A Supabase client acting as the signed-in student who called the function, so database
 * functions see them as auth.uid(). Null for the public app key alone or an expired session.
 */
export async function signedInStudent(req: Request): Promise<{ supabase: SupabaseClient; userId: string } | null> {
  const authorization = req.headers.get('Authorization') ?? '';
  const token = authorization.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return { supabase, userId: data.user.id };
}
