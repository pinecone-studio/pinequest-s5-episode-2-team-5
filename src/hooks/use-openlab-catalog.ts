import { loadInvestigation } from '@/lib/investigation-storage';
import type { InvestigationAttempt } from '@/lib/textbook-investigations';
import { useCallback, useEffect, useRef, type RefObject } from 'react';

import { fetchPublishedExperiments } from '@/services/experiments';

/** Pass public catalog JSON into the same-origin lab, without exposing auth sessions. */
export function useOpenLabCatalog(frame: RefObject<HTMLIFrameElement | null>, requested?: string | null, userId?: string) {
  const inquiry = useRef<{id:string;attempt:InvestigationAttempt}|null>(null);
  const catalog = useRef<unknown[] | null>(null);
  const sendCatalog = useCallback(() => {
    if (catalog.current !== null) frame.current?.contentWindow?.postMessage({
      type: 'chemquest:experiment-catalog', version: 1, rows: catalog.current,
    }, window.location.origin);
    if (inquiry.current) frame.current?.contentWindow?.postMessage({type:'chemquest:investigation-load',version:1,...inquiry.current},window.location.origin);
  }, [frame]);

  useEffect(()=>{
    let active=true;inquiry.current=null;
    if(requested&&userId)void loadInvestigation(userId,requested).then((attempt)=>{if(active){inquiry.current={id:requested,attempt};sendCatalog();}},()=>undefined);
    return()=>{active=false;};
  },[requested,userId,sendCatalog]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const receive = (event: MessageEvent<unknown>) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      const data = event.data;
      if (data && typeof data === 'object' && 'type' in data && data.type === 'openlab:catalog-ready' && 'version' in data && data.version === 1) sendCatalog();
    };
    window.addEventListener('message', receive);
    void fetchPublishedExperiments(controller.signal)
      .then((rows) => {
        if (!controller.signal.aborted) { catalog.current = rows; sendCatalog(); }
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
