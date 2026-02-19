import api from "../api/axios";

export const getTransactions = async () => {
    const response = await api.get("/transactions");
    return response.data;
};

/** GET /transactions/{id} - returns full axios response so caller can use res.data */
export const getTransaction = (id) => api.get(`/transactions/${id}`);
