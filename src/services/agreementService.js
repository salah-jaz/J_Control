import api from '../api/axios';

const agreementService = {
    getAll: (params) => api.get('/agreements', { params }),
    get: (id) => api.get(`/agreements/${id}`),
    create: (data) => api.post('/agreements', data),
    update: (id, data) => api.put(`/agreements/${id}`, data),
    delete: (id) => api.delete(`/agreements/${id}`),
    getNextNumber: () => api.get('/agreements/next-number'),
};

export default agreementService;
