import api from "../api/axios";
import { apiFetchList } from "../utils/apiFetch";

// Helper to transform API data to Frontend format
const toFrontend = (data) => ({
    id: data.id,
    invoice_id: data.invoice_id,
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
    bankAccountId: data.bank_account_id,
    receivedDate: data.received_date,
    status: data.status,
    gstApplied: data.gst_applied,
    gstPercent: data.gst_percent,
    gstAmount: data.gst_amount,
    netAmount: data.net_amount,
    staff: data.staff,
    department: data.department,
    notes: data.notes,
    description: data.description,
    referenceNumber: data.reference_number,
    invoiceDate: data.invoice_date,
    dueDate: data.due_date,
    recurring: data.recurring,
    frequency: data.frequency,
    clientEmail: data.client_email,
    clientPhone: data.client_phone,
    paymentTerms: data.payment_terms,
    discountApplied: data.discount_applied,
    discountAmount: data.discount_amount,
    lateFee: data.late_fee,
    collectionStatus: data.collection_status,
    followUpDate: data.follow_up_date,
    commission: data.commission,
    taxCategory: data.tax_category,
    initialDepositAmount: data.initial_deposit_amount,
    initialDepositBankId: data.initial_deposit_bank_id,
    initialDepositBankName: data.initial_deposit_bank_name,
    extraInstallments: Array.isArray(data.extra_installments) ? data.extra_installments.map((i) => ({
        date: i.date,
        amount: i.amount,
        bankAccountId: i.bank_account_id,
        bankName: i.bank_name || "",
        note: i.note || "",
    })) : [],
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
    bank_account_id: clean(data.bankAccountId),
    received_date: clean(data.receivedDate),
    status: clean(data.status),
    gst_applied: clean(data.gstApplied),
    gst_percent: clean(data.gstPercent),
    gst_amount: data.taxAmount != null && data.taxAmount !== "" ? parseFloat(data.taxAmount) : null,
    net_amount: (parseFloat(data.amount) || 0) - (parseFloat(data.discount) || 0) + (parseFloat(data.taxAmount) || 0),
    staff: clean(data.staff),
    department: clean(data.department),
    notes: clean(data.notes),
    description: clean(data.description),
    reference_number: clean(data.referenceNumber),
    invoice_date: clean(data.invoiceDate),
    due_date: clean(data.dueDate),
    recurring: clean(data.recurring),
    frequency: clean(data.frequency),
    client_email: clean(data.clientEmail),
    client_phone: clean(data.clientPhone),
    payment_terms: clean(data.paymentTerms),
    discount_applied: clean(data.discountApplied),
    discount_amount: data.discount != null && data.discount !== "" ? parseFloat(data.discount) : null,
    late_fee: clean(data.lateFee),
    collection_status: clean(data.collectionStatus),
    follow_up_date: clean(data.followUpDate),
    commission: clean(data.commission),
    tax_category: clean(data.taxCategory),
    initial_deposit_amount: data.initialDepositAmount != null && data.initialDepositAmount !== "" ? parseFloat(data.initialDepositAmount) : null,
    initial_deposit_bank_id: data.initialDepositBankId || null,
    extra_installments: Array.isArray(data.extraInstallments) ? data.extraInstallments.map(({ date, amount, bankAccountId, bankName, note }) => ({
        date: date || null,
        amount: amount != null && amount !== "" ? parseFloat(amount) : null,
        bank_account_id: bankAccountId || null,
        bank_name: bankName || "",
        note: note || "",
    })) : null,
});

/**
 * Fetch incomes with optional filters. Returns { data: [], meta: null|{} } like clients/invoices.
 * @param {Object} [filters] - { search, status, category, bank_account_id, date_from, date_to, page, per_page }
 */
export const getIncomes = async (filters = {}) => {
    const params = {};
    if (filters.search != null && String(filters.search).trim() !== '') params.search = filters.search.trim();
    if (filters.status != null && filters.status !== '' && filters.status !== 'all') params.status = filters.status;
    if (filters.category != null && filters.category !== '') params.category = filters.category;
    if (filters.bank_account_id != null && filters.bank_account_id !== '') params.bank_account_id = filters.bank_account_id;
    if (filters.date_from != null && filters.date_from !== '') params.date_from = filters.date_from;
    if (filters.date_to != null && filters.date_to !== '') params.date_to = filters.date_to;
    if (filters.page != null) params.page = filters.page;
    if (filters.per_page != null) params.per_page = filters.per_page;

    const result = await apiFetchList("/incomes", { params });
    const arr = Array.isArray(result.data) ? result.data : [];
    const data = arr.map(toFrontend);
    return { data, meta: result.meta };
};

/** GET /incomes/summary - dashboard totals */
export const getIncomeSummary = async () => {
    const response = await api.get("/incomes/summary");
    return response.data;
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
