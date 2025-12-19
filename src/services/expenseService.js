
import api from "../api/axios";

// Helper to transform API data to Frontend format
const toFrontend = (data) => ({
    id: data.id,
    vendor: data.vendor,
    expenseType: data.expense_type,
    project: data.project,
    category: data.category,
    billNo: data.bill_no,
    amount: data.amount,
    currency: data.currency,
    method: data.method,
    transactionId: data.transaction_id,
    bank: data.bank,
    paidDate: data.paid_date,
    status: data.status,
    gstApplied: data.gst_applied,
    gstPercent: data.gst_percent,
    gstAmount: data.gst_amount,
    netAmount: data.net_amount,
    vendorGstin: data.vendor_gstin,
    itcEligible: data.itc_eligible,
    staff: data.staff,
    department: data.department,
    notes: data.notes,
    createdAt: data.created_at,
});

const clean = (val) => (val === "" || val === undefined ? null : val);

// Helper to transform Frontend data to API format
const toBackend = (data) => ({
    vendor: clean(data.vendor),
    expense_type: clean(data.expenseType),
    project: clean(data.project),
    category: clean(data.category),
    bill_no: clean(data.billNo),
    amount: clean(data.amount),
    currency: clean(data.currency),
    method: clean(data.method),
    transaction_id: clean(data.transactionId),
    bank: clean(data.bank),
    paid_date: clean(data.paidDate),
    status: clean(data.status),
    gst_applied: clean(data.gstApplied),
    gst_percent: clean(data.gstPercent),
    gst_amount: clean(data.gstAmount),
    net_amount: clean(data.netAmount),
    vendor_gstin: clean(data.vendorGstin),
    itc_eligible: clean(data.itcEligible),
    staff: clean(data.staff),
    department: clean(data.department),
    notes: clean(data.notes),
});

export const getExpenses = async () => {
    const response = await api.get("/expenses");
    return response.data.map(toFrontend);
};

export const createExpense = async (expense) => {
    const response = await api.post("/expenses", toBackend(expense));
    return toFrontend(response.data);
};

export const updateExpense = async (id, expense) => {
    const response = await api.put(`/expenses/${id}`, toBackend(expense));
    return toFrontend(response.data);
};

export const deleteExpense = async (id) => {
    await api.delete(`/expenses/${id}`);
};
