import { queryClient } from './queryClient';
import { queryKeys } from './queryKeys';
import { getDashboardStats, getClients, getClientLocations } from '../services/db';
import { getProducts } from '../services/productService';
import { getInvoices, getInvoiceSummary } from '../services/invoiceService';
import { getIncomes, getIncomeSummary } from '../services/incomeService';

const STALE_TWO_MIN = 2 * 60 * 1000;

/**
 * Prefetch frequently used data when the app loads (after login).
 * Enables instant navigation to Dashboard, Clients, Products, Invoices, Income.
 * All requests run in parallel; cache is populated in the background.
 */
export function prefetchAppData() {
  Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.dashboard.stats(),
      queryFn: getDashboardStats,
      staleTime: STALE_TWO_MIN,
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.clients.list({}),
      queryFn: () => getClients({}),
      staleTime: STALE_TWO_MIN,
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.clients.locations(),
      queryFn: getClientLocations,
      staleTime: 5 * 60 * 1000,
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.products.list(),
      queryFn: getProducts,
      staleTime: STALE_TWO_MIN,
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.invoices.list({ page: 1, per_page: 20 }),
      queryFn: () => getInvoices({ page: 1, per_page: 20 }),
      staleTime: STALE_TWO_MIN,
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.invoices.summary(),
      queryFn: getInvoiceSummary,
      staleTime: 60 * 1000,
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.income.list(),
      queryFn: getIncomes,
      staleTime: STALE_TWO_MIN,
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.income.summary(),
      queryFn: getIncomeSummary,
      staleTime: 60 * 1000,
    }),
  ]).catch((err) => {
    console.warn('Prefetch partially failed:', err);
  });
}
