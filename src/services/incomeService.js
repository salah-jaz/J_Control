
import api from "../api/axios";

// Helper to transform API data to Frontend format
const toFrontend = (data) => ({
    id: data.id, // Ensure ID is included
    client: data.client,
    source: data.source,
    project: data.project,
    category: data.category,
    invoiceNo: data.invoice_no,
    amount: data.amount,
    currency: data.currency,
    method: data.method,
    transactionId: data.transaction_id,
    bank: data.bank,
    receivedDate: data.received_date,
    status: data.status,
    gstApplied: data.gst_applied,
    gstPercent: data.gst_percent,
    gstAmount: data.gst_amount,
    netAmount: data.net_amount,
    staff: data.staff,
    department: data.department,
    notes: data.notes,
    createdAt: data.created_at,
});

// Helper to transform Frontend data to API format
// Helper to clean data (empty strings -> null)
const clean = (val) => (val === "" || val === undefined ? null : val);

// Helper to transform Frontend data to API format
const toBackend = (data) => ({
    client: clean(data.client),
    source: clean(data.source),
    project: clean(data.project),
    category: clean(data.category),
    invoice_no: clean(data.invoiceNo),
    amount: clean(data.amount),
    currency: clean(data.currency),
    method: clean(data.method),
    transaction_id: clean(data.transactionId),
    bank: clean(data.bank),
    received_date: clean(data.receivedDate),
    status: clean(data.status),
    gst_applied: clean(data.gstApplied),
    gst_percent: clean(data.gstPercent),
    gst_amount: clean(data.gstAmount),
    net_amount: clean(data.netAmount),
    staff: clean(data.staff),
    department: clean(data.department),
    notes: clean(data.notes),
});

export const getIncomes = async () => {
    const response = await api.get("/incomes");
    return response.data.map(toFrontend);
};

export const createIncome = async (income) => {
    const response = await api.post("/incomes", toBackend(income));
    return toFrontend(response.data);
};

export const updateIncome = async (id, income) => {
    const response = await api.put(`/incomes/${id}`, toBackend(income));
    return toFrontend(response.data);
};

export const deleteIncome = async (id) => {
    await api.delete(`/incomes/${id}`);
};
