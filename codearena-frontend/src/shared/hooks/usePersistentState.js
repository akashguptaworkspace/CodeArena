import { useEffect, useState } from "react";

// useState that remembers its value in localStorage (for UI preferences like filters).
export function usePersistentState(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored === null ? initialValue : { ...initialValue, ...JSON.parse(stored) };
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* preference just won't persist */
    }
  }, [key, value]);

  return [value, setValue];
}
