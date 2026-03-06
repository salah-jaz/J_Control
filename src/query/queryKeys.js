/**
 * Centralized query keys for React Query cache.
 * Used for cache lookup, invalidation, and prefetching.
 */
export const queryKeys = {
  dashboard: {
    all: ['dashboard'],
    stats: () => ['dashboard', 'stats'],
    todayIncome: (today) => ['dashboard', 'todayIncome', today],
  },
  clients: {
    all: ['clients'],
    list: (filters = {}) => ['clients', 'list', filters],
    locations: () => ['clients', 'locations'],
  },
  products: {
    all: ['products'],
    list: () => ['products', 'list'],
  },
  invoices: {
    all: ['invoices'],
    list: () => ['invoices', 'list'],
    summary: () => ['invoices', 'summary'],
    detail: (id) => ['invoices', 'detail', id],
    nextNumber: () => ['invoices', 'nextNumber'],
  },
  income: {
    all: ['income'],
    list: () => ['income', 'list'],
    summary: () => ['income', 'summary'],
  },
  quotations: {
    all: ['quotations'],
    list: (params) => ['quotations', 'list', params],
  },
  leads: {
    all: ['leads'],
    list: () => ['leads', 'list'],
  },
  reports: {
    summary: (filters) => ['reports', 'summary', filters],
    filters: () => ['reports', 'filters'],
  },
  users: () => ['users'],
  settings: () => ['settings'],
  bankAccounts: () => ['bank-accounts'],
  transactions: () => ['transactions'],
  expenses: {
    list: () => ['expenses', 'list'],
    summary: () => ['expenses', 'summary'],
  },
  planner: {
    stats: () => ['planner', 'stats'],
    events: (params) => ['planner', 'events', params],
    today: () => ['planner', 'today'],
  },
};
