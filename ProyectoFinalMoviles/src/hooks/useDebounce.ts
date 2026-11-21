import { useEffect, useState } from 'react';

/**
 * Returns the received value, but only after it stops changing for "ms" milliseconds.
 * Used in the search so the API is not called on every typed letter.
 */
export function useDebounce<T>(value: T, ms = 400): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), ms);
    // If the value changes before the time is up, the previous timer is cancelled
    return () => clearTimeout(timer);
  }, [value, ms]);

  return debouncedValue;
}
