import { useCallback, useEffect, useState } from 'react';

export type FlashType = 'success' | 'error' | 'info';

export interface FlashMessage {
  type: FlashType;
  text: string;
}

export function useFlashMessage(durationMs = 3500) {
  const [message, setMessage] = useState<FlashMessage | null>(null);

  const show = useCallback((type: FlashType, text: string) => {
    setMessage({ type, text });
  }, []);

  const clear = useCallback(() => setMessage(null), []);

  useEffect(() => {
    if (!message) return;
    const id = window.setTimeout(() => setMessage(null), durationMs);
    return () => window.clearTimeout(id);
  }, [message, durationMs]);

  return { message, show, clear };
}
