import { loadInvestigation } from '@/lib/investigation-storage';
import type { InvestigationAttempt } from '@/lib/textbook-investigations';
import { useCallback, useEffect, useRef, type RefObject } from 'react';

import { fetchPublishedExperiments } from '@/services/experiments';
import { supabase } from '@/lib/supabase';
import { CLASSES } from '@/data/classes';

/** Pass public catalog JSON into the same-origin lab, without exposing auth sessions. */
export function useOpenLabCatalog(frame: RefObject<HTMLIFrameElement | null>, requested?: string | null, userId?: string) {
  const inquiry = useRef<{id:string;attempt:InvestigationAttempt}|null>(null);
  const catalog = useRef<unknown[]>([]);
  const sendCatalog = useCallback((target: Window | null) => {
    target?.postMessage({
      type: 'chemquest:experiment-catalog', version: 1, rows: catalog.current, lessons: CLASSES,
    }, window.location.origin);
    if (inquiry.current) target?.postMessage({type:'chemquest:investigation-load',version:1,...inquiry.current},window.location.origin);
  }, []);

  useEffect(()=>{
    let active=true;inquiry.current=null;
    if(requested&&userId)void loadInvestigation(userId,requested).then((attempt)=>{if(active){inquiry.current={id:requested,attempt};sendCatalog(frame.current?.contentWindow ?? null);}},()=>undefined);
    return()=>{active=false;};
  },[requested,userId,sendCatalog,frame]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const receive = (event: MessageEvent<unknown>) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      const data = event.data;
      if (!data || typeof data !== 'object' || !('type' in data)) return;
      const message = data as { type?: unknown; version?: unknown; id?: unknown; question?: unknown; history?: unknown; context?: unknown; tone?: unknown; event?: unknown };
      if (message.type === 'openlab:catalog-ready' && message.version === 1) { sendCatalog(frame.current?.contentWindow ?? null); return; }
      if (message.version !== 1 || typeof message.id !== 'string' || typeof message.context !== 'string') return;
      // Star's chat questions, and its short comments on lab moments: both answered by openlab-tutor.
      let body: Record<string, unknown>;
      if (message.type === 'openlab:ask-pip' && typeof message.question === 'string' && Array.isArray(message.history)) body = { question: message.question, history: message.history, context: message.context };
      else if (message.type === 'openlab:star-comment' && typeof message.tone === 'string' && typeof message.event === 'string') body = { kind: 'comment', tone: message.tone, event: message.event, context: message.context };
      else return;
      const id = message.id;
      void supabase.functions.invoke('openlab-tutor', { body }).then(({ data: result, error }) => {
        frame.current?.contentWindow?.postMessage({
          type: 'chemquest:pip-answer', version: 1, id,
          answer: !error && result && typeof result.answer === 'string' ? result.answer : null,
          error: error ? 'Star түр хариулж чадсангүй. Дахин оролдоно уу.' : null,
        }, window.location.origin);
      }).catch(() => frame.current?.contentWindow?.postMessage({ type: 'chemquest:pip-answer', version: 1, id, answer: null }, window.location.origin));
    };
    window.addEventListener('message', receive);
    void fetchPublishedExperiments(controller.signal)
      .then((rows) => {
        if (!controller.signal.aborted) { catalog.current = rows; sendCatalog(frame.current?.contentWindow ?? null); }
      })
      .catch(() => {
        // Table not created yet, timeout, or offline: the lab keeps its bundled catalog.
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      controller.abort(); clearTimeout(timeout);
      window.removeEventListener('message', receive);
    };
  }, [frame, sendCatalog]);

  return sendCatalog;
}
