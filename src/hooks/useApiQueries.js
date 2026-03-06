import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../query/queryKeys';
import {
  getDashboardStats,
  getReportsSummary,
  getClients,
  getClientLocations,
  saveClient,
  deleteClient,
} from '../services/db';
import { getProducts, createProduct, updateProduct, deleteProduct } from '../services/productService';
import {
  getInvoices,
  getInvoiceSummary,
  getNextInvoiceNumber,
  deleteInvoice as deleteInvoiceApi,
} from '../services/invoiceService';
import { getIncomes, getIncomeSummary } from '../services/incomeService';

const STALE_TWO_MIN = 2 * 60 * 1000;

// ----- Dashboard (parallel: stats + today income) -----
export function useDashboardData() {
  const today = new Date().toISOString().split('T')[0];
  const statsQuery = useQuery({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: getDashboardStats,
    staleTime: STALE_TWO_MIN,
  });
  const todayIncomeQuery = useQuery({
    queryKey: queryKeys.dashboard.todayIncome(today),
    queryFn: () => getReportsSummary({ startDate: today, endDate: today }),
    staleTime: 60 * 1000,
    enabled: !!statsQuery.data,
  });
  const isLoading = statsQuery.isLoading;
  const isFetching = statsQuery.isFetching || todayIncomeQuery.isFetching;
  const stats = statsQuery.data ?? {
    totalClients: 0,
    activeClients: 0,
    totalInvoices: 0,
    totalRevenue: 0,
    pendingAmount: 0,
    recentInvoices: [],
    monthlyRevenue: [],
    invoiceStatusCounts: [],
    todaysEvents: [],
  };
  const todayIncome = todayIncomeQuery.data?.totalIncome ?? 0;
  const todaysEvents = stats.todaysEvents || [];
  const refetch = () => {
    statsQuery.refetch();
    todayIncomeQuery.refetch();
  };
  return {
    stats,
    todayIncome,
    todaysEvents,
    isLoading,
    isFetching,
    refetch,
    error: statsQuery.error || todayIncomeQuery.error,
  };
}

// ----- Clients -----
export function useClients(filters = {}) {
  return useQuery({
    queryKey: queryKeys.clients.list(filters),
    queryFn: () => getClients(filters),
    staleTime: STALE_TWO_MIN,
    placeholderData: (prev) => prev,
  });
}

export function useClientLocations() {
  return useQuery({
    queryKey: queryKeys.clients.locations(),
    queryFn: getClientLocations,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSaveClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: saveClient,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clients.all });
    },
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteClient,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clients.all });
    },
  });
}

// ----- Products -----
export function useProducts() {
  return useQuery({
    queryKey: queryKeys.products.list(),
    queryFn: getProducts,
    staleTime: STALE_TWO_MIN,
    placeholderData: (prev) => prev,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createProduct,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.products.all }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateProduct(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.products.all }),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.products.all }),
  });
}

// ----- Invoices -----
export function useInvoices(params = {}) {
  return useQuery({
    queryKey: queryKeys.invoices.list(params),
    queryFn: () => getInvoices(params),
    staleTime: STALE_TWO_MIN,
    placeholderData: (prev) => prev,
  });
}

export function useInvoiceSummary() {
  return useQuery({
    queryKey: queryKeys.invoices.summary(),
    queryFn: getInvoiceSummary,
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

export function useNextInvoiceNumber(enabled = true) {
  return useQuery({
    queryKey: queryKeys.invoices.nextNumber(),
    queryFn: getNextInvoiceNumber,
    staleTime: 0,
    enabled,
  });
}

export function useDeleteInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteInvoiceApi,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.invoices.all });
    },
  });
}

// ----- Income -----
export function useIncomeList() {
  return useQuery({
    queryKey: queryKeys.income.list(),
    queryFn: getIncomes,
    staleTime: STALE_TWO_MIN,
    placeholderData: (prev) => prev,
  });
}

export function useIncomeSummary() {
  return useQuery({
    queryKey: queryKeys.income.summary(),
    queryFn: getIncomeSummary,
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  });
}
