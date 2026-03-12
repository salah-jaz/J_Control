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
    list: (filters = {}) => ['income', 'list', filters],
    summary: () => ['income', 'summary'],
  },
  quotations: {
    all: ['quotations'],
    list: (filters = {}) => ['quotations', 'list', filters],
    summary: () => ['quotations', 'summary'],
  },
  leads: {
    all: ['leads'],
    list: (filters = {}) => ['leads', 'list', filters],
  },
  reports: {
    summary: (filters) => ['reports', 'summary', filters],
    details: (type, filters) => ['reports', 'details', type, filters],
    filters: () => ['reports', 'filters'],
  },
  users: {
    all: ['users'],
    list: (filters = {}) => ['users', 'list', filters],
  },
  settings: () => ['settings'],
  bankAccounts: () => ['bank-accounts'],
  transactions: {
    all: ['transactions'],
    list: (filters = {}) => ['transactions', 'list', filters],
    summary: () => ['transactions', 'summary'],
  },
  expenses: {
    all: ['expenses'],
    list: (filters = {}) => ['expenses', 'list', filters],
    summary: () => ['expenses', 'summary'],
  },
  planner: {
    stats: () => ['planner', 'stats'],
    events: (params) => ['planner', 'events', params],
    today: () => ['planner', 'today'],
  },
};
