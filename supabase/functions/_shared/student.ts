import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.118.0';

/**
 * A Supabase client acting as the signed-in student who called the function, so database
 * functions see them as auth.uid(). Null for the public app key alone or an expired session.
 */
export async function signedInStudent(req: Request): Promise<{ supabase: SupabaseClient; userId: string } | null> {
  const authorization = req.headers.get('Authorization') ?? '';
  const token = authorization.replace(/^Bearer\s+/i, '');
  if (!token) {
    console.warn('refused: no Authorization header');
    return null;
  }
  // Projects on the new API keys (sb_publishable_…) can have the legacy anon key switched off, which
  // made every student look signed out. The app sends its own public key with each request; use that.
  const apiKey = req.headers.get('apikey') || Deno.env.get('SUPABASE_ANON_KEY') || '';
  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', apiKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    // The public app key alone lands here too ("missing sub claim"); an expired session says so.
    console.warn('refused: not a signed-in student', error?.message ?? 'no user');
    return null;
  }
  return { supabase, userId: data.user.id };
}
