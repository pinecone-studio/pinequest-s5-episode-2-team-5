import { supabase } from '@/lib/supabase';

/** Public lesson definitions only. RLS excludes drafts and prevents client edits. */
export async function fetchPublishedExperiments(signal: AbortSignal): Promise<unknown[]> {
  const { data, error } = await supabase
    .from('experiments')
    .select('id, schema_version, content')
    .eq('is_published', true)
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true })
    .limit(250)
    .abortSignal(signal);
  if (error) throw new Error('Experiment catalog could not be loaded');
  if (!Array.isArray(data)) throw new Error('Invalid experiment catalog response');
  return data;
}
