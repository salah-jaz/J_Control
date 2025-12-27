import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
};

export const getProducts = async () => {
    const response = await axios.get(`${API_URL}/products`, { headers: getAuthHeader() });
    return response.data;
};

export const createProduct = async (data) => {
    const response = await axios.post(`${API_URL}/products`, data, { headers: getAuthHeader() });
    return response.data;
};

export const updateProduct = async (id, data) => {
    const response = await axios.put(`${API_URL}/products/${id}`, data, { headers: getAuthHeader() });
    return response.data;
};

export const deleteProduct = async (id) => {
    const response = await axios.delete(`${API_URL}/products/${id}`, { headers: getAuthHeader() });
    return response.data;
};
