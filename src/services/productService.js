import api from '../api/axios';
import { apiFetchList } from '../utils/apiFetch';

export const getProducts = async () => {
    const result = await apiFetchList('/products');
    return Array.isArray(result.data) ? result.data : [];
};

export const createProduct = async (data) => {
    const response = await api.post('/products', data);
    return response.data;
};

export const updateProduct = async (id, data) => {
    const response = await api.put(`/products/${id}`, data);
    return response.data;
};

export const deleteProduct = async (id) => {
    const response = await api.delete(`/products/${id}`);
    return response.data;
};
