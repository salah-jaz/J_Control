import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../query/queryKeys';
import { invalidateCache } from '../utils/apiFetch';
import {
  getDashboardStats,
  getReportsSummary,
  getReportDetails,
  getReportFilters,
  getClients,
  getClientLocations,
  getLeads,
  saveClient,
  deleteClient,
  saveLead,
  deleteLead,
  getUsers,
  getSettings,
} from '../services/db';
import { getProducts, createProduct, updateProduct, deleteProduct } from '../services/productService';
import {
  getInvoices,
  getInvoiceSummary,
  getNextInvoiceNumber,
  deleteInvoice as deleteInvoiceApi,
} from '../services/invoiceService';
import { getIncomes, getIncomeSummary } from '../services/incomeService';
import { getQuotations, getQuotationSummary } from '../services/quotationService';
import { getExpenses, getExpenseSummary } from '../services/expenseService';
import { getTransactions, getTransactionSummary } from '../services/transactionService';

const STALE_TWO_MIN = 2 * 60 * 1000;

// ----- Dashboard (single API: all stats + today income + events) -----
const defaultDashboardStats = {
  totalClients: 0,
  activeClients: 0,
  totalInvoices: 0,
  totalRevenue: 0,
  pendingAmount: 0,
  todayIncome: 0,
  recentInvoices: [],
  recentIncomes: [],
  monthlyRevenue: [],
  invoiceStatusCounts: [],
  todaysEvents: [],
};

export function useDashboardData() {
  const statsQuery = useQuery({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: getDashboardStats,
    staleTime: STALE_TWO_MIN,
  });
  const stats = statsQuery.data ?? defaultDashboardStats;
  const todayIncome = stats.recentIncomes ?? [];
  const todayIncomeSum = stats.todayIncome ?? 0;
  const todaysEvents = stats.todaysEvents ?? [];
  return {
    stats,
    todayIncome,
    todayIncomeSum,
    todaysEvents,
    isLoading: statsQuery.isLoading,
    isFetching: statsQuery.isFetching,
    refetch: () => statsQuery.refetch(),
    error: statsQuery.error,
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
      invalidateCache('/clients');
      qc.invalidateQueries({ queryKey: queryKeys.clients.all });
    },
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteClient,
    onSuccess: () => {
      invalidateCache('/clients');
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
    onSuccess: () => {
      invalidateCache('/products');
      qc.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateProduct(id, data),
    onSuccess: () => {
      invalidateCache('/products');
      qc.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      invalidateCache('/products');
      qc.invalidateQueries({ queryKey: queryKeys.products.all });
    },
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

export function useInvoiceSummary(filters = {}) {
  return useQuery({
    queryKey: queryKeys.invoices.summary(filters),
    queryFn: () => getInvoiceSummary(filters),
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
      invalidateCache('/invoices');
      invalidateCache('/bank-accounts');
      invalidateCache('/incomes');
      qc.invalidateQueries({ queryKey: queryKeys.invoices.all });
      qc.invalidateQueries({ queryKey: queryKeys.income.all });
      qc.invalidateQueries({ queryKey: queryKeys.transactions.all });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

// ----- Leads -----
export function useLeads(filters = {}) {
  return useQuery({
    queryKey: queryKeys.leads.list(filters),
    queryFn: () => getLeads(filters),
    staleTime: STALE_TWO_MIN,
    placeholderData: (prev) => prev,
  });
}

export function useSaveLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: saveLead,
    onSuccess: () => {
      invalidateCache('/leads');
      qc.invalidateQueries({ queryKey: queryKeys.leads.all });
    },
  });
}

export function useDeleteLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteLead,
    onSuccess: () => {
      invalidateCache('/leads');
      qc.invalidateQueries({ queryKey: queryKeys.leads.all });
    },
  });
}

// ----- Income -----
export function useIncomeList(filters = {}) {
  return useQuery({
    queryKey: queryKeys.income.list(filters),
    queryFn: () => getIncomes(filters),
    staleTime: STALE_TWO_MIN,
    placeholderData: (prev) => prev,
  });
}

export function useIncomeSummary(filters = {}) {
  return useQuery({
    queryKey: queryKeys.income.summary(filters),
    queryFn: () => getIncomeSummary(filters),
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

// ----- Quotations -----
export function useQuotationList(filters = {}) {
  return useQuery({
    queryKey: queryKeys.quotations.list(filters),
    queryFn: () => getQuotations(filters),
    staleTime: STALE_TWO_MIN,
    placeholderData: (prev) => prev,
  });
}

export function useQuotationSummary(filters = {}) {
  return useQuery({
    queryKey: queryKeys.quotations.summary(filters),
    queryFn: () => getQuotationSummary(filters),
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

// ----- Expenses -----
export function useExpenseList(filters = {}) {
  return useQuery({
    queryKey: queryKeys.expenses.list(filters),
    queryFn: () => getExpenses(filters),
    staleTime: STALE_TWO_MIN,
    placeholderData: (prev) => prev,
  });
}

export function useExpenseSummary(filters = {}) {
  return useQuery({
    queryKey: queryKeys.expenses.summary(filters),
    queryFn: () => getExpenseSummary(filters),
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

// ----- Transactions -----
export function useTransactionList(filters = {}) {
  return useQuery({
    queryKey: queryKeys.transactions.list(filters),
    queryFn: () => getTransactions(filters),
    staleTime: STALE_TWO_MIN,
    placeholderData: (prev) => prev,
  });
}

export function useTransactionSummary(filters = {}) {
  return useQuery({
    queryKey: queryKeys.transactions.summary(filters),
    queryFn: () => getTransactionSummary(filters),
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

// ----- Reports -----
export function useReportsSummary(filters = {}) {
  return useQuery({
    queryKey: queryKeys.reports.summary(filters),
    queryFn: () => getReportsSummary(filters),
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

export function useReportDetails(reportType, filters = {}) {
  return useQuery({
    queryKey: queryKeys.reports.details(reportType, filters),
    queryFn: () => getReportDetails(reportType, filters),
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
    enabled: !!reportType,
  });
}

export function useReportFilters() {
  return useQuery({
    queryKey: queryKeys.reports.filters(),
    queryFn: getReportFilters,
    staleTime: 5 * 60 * 1000,
  });
}

// ----- Users -----
export function useUsers(filters = {}) {
  return useQuery({
    queryKey: queryKeys.users.list(filters),
    queryFn: () => getUsers(filters),
    staleTime: STALE_TWO_MIN,
    placeholderData: (prev) => prev,
  });
}

// ----- Settings -----
export function useSettings() {
  return useQuery({
    queryKey: queryKeys.settings(),
    queryFn: getSettings,
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}
