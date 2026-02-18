import api from '../api/axios';

export const getNextInvoiceNumber = async () => {
  const response = await api.get('/invoices/next-number');
  return response.data.invoice_number;
};

export const getInvoiceSummary = async () => {
  try {
    const response = await api.get('/invoices/summary');
    return response.data;
  } catch (e) {
    console.error('Failed to fetch invoice summary', e);
    return null;
  }
};

export const getInvoices = async () => {
  try {
    const response = await api.get('/invoices');
    return response.data;
  } catch (e) {
    console.error('Failed to fetch invoices', e);
    return [];
  }
};

export const getInvoice = async (id) => {
  const response = await api.get(`/invoices/${id}`);
  return response.data;
};

export const createInvoice = async (data) => {
  const response = await api.post('/invoices', data, data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {});
  return response.data;
};

export const updateInvoice = async (id, data) => {
  if (data instanceof FormData) {
    data.append('_method', 'PUT');
    const response = await api.post(`/invoices/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
    return response.data;
  }
  const response = await api.put(`/invoices/${id}`, data);
  return response.data;
};

export const deleteInvoice = async (id) => {
  await api.delete(`/invoices/${id}`);
};
