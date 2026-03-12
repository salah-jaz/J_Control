import { useState, useEffect } from 'react';

/**
 * Debounce a value by the given delay (e.g. 300ms for search).
 * Use for search inputs so API requests fire after user stops typing.
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
