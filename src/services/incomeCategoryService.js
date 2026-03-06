import api from "../api/axios";
import { apiFetchList } from "../utils/apiFetch";

/** GET /income-categories */
export const getIncomeCategories = async () => {
  const result = await apiFetchList("/income-categories");
  return Array.isArray(result.data) ? result.data : [];
};

/** POST /income-categories */
export const createIncomeCategory = async (name) => {
  const response = await api.post("/income-categories", { name });
  return response.data;
};

/** DELETE /income-categories/{id} */
export const deleteIncomeCategory = async (id) => {
  await api.delete(`/income-categories/${id}`);
};
