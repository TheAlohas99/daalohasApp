import { useCallback, useEffect, useRef } from 'react';

export default function useDebounced(fn, delay = 80) {
  const r = useRef({ t: null, fn });
  r.current.fn = fn;
  const debounced = useCallback((...args) => {
    if (r.current.t) clearTimeout(r.current.t);
    r.current.t = setTimeout(() => r.current.fn(...args), delay);
  }, [delay]);
  useEffect(() => () => r.current.t && clearTimeout(r.current.t), []);
  return debounced;
}
