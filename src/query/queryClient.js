import { QueryClient } from '@tanstack/react-query';

/** Default stale time: 2 minutes. Data is considered fresh; no refetch on remount. */
const STALE_TIME_MS = 2 * 60 * 1000;
/** Cache time: 10 minutes. Unused data stays in cache for prefetch/navigation. */
const GC_TIME_MS = 10 * 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE_TIME_MS,
      gcTime: GC_TIME_MS,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
