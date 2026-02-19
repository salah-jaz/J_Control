import api from "../api/axios";

/** GET /income-categories */
export const getIncomeCategories = async () => {
  const response = await api.get("/income-categories");
  return response.data;
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
