import { useEffect, useState } from 'react';

/**
 * Tracks whether the component has mounted on the client.
 * Used to defer client-only rendering (e.g. window.print, locale-dependent
 * formatting) and avoid SSR/client hydration mismatches.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional client-mount flag, not a derived value
    setMounted(true);
  }, []);
  return mounted;
}
