import api from "../api/axios";
import { apiFetchList } from "../utils/apiFetch";

export const getExpenseCategories = async () => {
  const result = await apiFetchList("/expense-categories");
  return Array.isArray(result.data) ? result.data : [];
};

export const createExpenseCategory = async (name) => {
  const response = await api.post("/expense-categories", { name });
  return response.data;
};

export const deleteExpenseCategory = async (id) => {
  await api.delete(`/expense-categories/${id}`);
};
