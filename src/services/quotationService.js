import api from '../api/axios';

/**
 * @param {Object} [params] - Optional: { search, status, client_id, date_from, date_to }
 */
export const getQuotations = async (params = {}) => {
  const response = await api.get('/quotations', { params });
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
