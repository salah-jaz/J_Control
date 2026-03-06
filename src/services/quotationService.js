import api from '../api/axios';
import { normalizeListResponse } from '../utils/apiFetch';

/**
 * List quotations with pagination and filters.
 * @param {Object} [filters] - { search, status, client_id, date_from, date_to, page, per_page }
 * @returns {Promise<{ data: Array, meta: Object|null }>}
 */
export const getQuotations = async (filters = {}) => {
  const params = { ...filters };
  if (params.status === 'All') delete params.status;
  const response = await api.get('/quotations', { params });
  const normalized = normalizeListResponse(response.data);
  return { data: normalized.data, meta: normalized.meta };
};

/**
 * Quotation summary for stats cards.
 * @returns {Promise<{ total, draft, sent, accepted, rejected, converted }>}
 */
export const getQuotationSummary = async () => {
  const response = await api.get('/quotations/summary');
  return response.data;
};

export const getQuotation = async (id) => {
  const response = await api.get(`/quotations/${id}`);
  return response.data;
};

export const createQuotation = async (payload) => {
  const response = await api.post('/quotations', payload);
  return response.data;
};

export const updateQuotation = async (id, payload) => {
  const response = await api.put(`/quotations/${id}`, payload);
  return response.data;
};

export const deleteQuotation = async (id) => {
  await api.delete(`/quotations/${id}`);
};

export const convertQuotationToInvoice = async (id) => {
  const response = await api.post(`/quotations/${id}/convert-to-invoice`);
  return response.data;
};
