
import api from "../api/axios";

export const getTransactions = async () => {
    const response = await api.get("/transactions");
    // The controller returns the data already formatted as we need it
    return response.data;
};
