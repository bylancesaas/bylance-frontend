import { useEffect, useState } from 'react';

const STORAGE_KEY = 'bylance_sensitive_values_visible';

export function useSensitiveValues(defaultVisible = false) {
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof window === 'undefined') return defaultVisible;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === null) return defaultVisible;
    return stored === 'true';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, String(isVisible));
  }, [isVisible]);

  return {
    isVisible,
    setIsVisible,
    toggleVisibility: () => setIsVisible((prev) => !prev),
  };
}
