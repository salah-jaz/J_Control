import api from "../api/axios";
import { normalizeListResponse } from "../utils/apiFetch";

/**
 * List transactions with pagination and filters.
 * @param {Object} [filters] - { search, type, status, bank_account_id, date_from, date_to, page, per_page }
 * @returns {Promise<{ data: Array, meta: Object|null }>}
 */
export const getTransactions = async (filters = {}) => {
    const params = { ...filters };
    const response = await api.get("/transactions", { params });
    return normalizeListResponse(response.data);
};

/** GET /transactions/{id} - returns full axios response so caller can use res.data */
export const getTransaction = (id) => api.get(`/transactions/${id}`);

/**
 * GET /transactions/summary - for stats cards.
 * @returns {Promise<{ totalTransactions, totalIncome, totalExpense, recentCount }>}
 */
export const getTransactionSummary = async (filters = {}) => {
    const params = { ...filters };
    const response = await api.get("/transactions/summary", { params });
    return response.data;
};
