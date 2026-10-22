import { useCallback, useEffect, useRef, type RefObject } from 'react';

import { fetchPublishedExperiments } from '@/services/experiments';

/** Pass public catalog JSON into the same-origin lab, without exposing auth sessions. */
export function useOpenLabCatalog(frame: RefObject<HTMLIFrameElement | null>) {
  const catalog = useRef<unknown[] | null>(null);
  const sendCatalog = useCallback(() => {
    if (catalog.current === null) return;
    frame.current?.contentWindow?.postMessage({
      type: 'chemquest:experiment-catalog', version: 1, rows: catalog.current,
    }, window.location.origin);
  }, [frame]);

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
