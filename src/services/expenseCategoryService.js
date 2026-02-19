import api from "../api/axios";

export const getExpenseCategories = async () => {
  const response = await api.get("/expense-categories");
  return response.data;
};

export const createExpenseCategory = async (name) => {
  const response = await api.post("/expense-categories", { name });
  return response.data;
};

export const deleteExpenseCategory = async (id) => {
  await api.delete(`/expense-categories/${id}`);
};
