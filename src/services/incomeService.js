import api from "../api/axios";
import { apiFetchList } from "../utils/apiFetch";

// Helper to transform API data to Frontend format
const toFrontend = (data) => {
    if (!data) return null;

    const rawTxns = Array.isArray(data.transactions) ? data.transactions : [];
    const transactions = rawTxns.map((tx) => {
        const prevBal = tx.previous_balance != null ? Number(tx.previous_balance) : (tx.previousBalance != null ? Number(tx.previousBalance) : null);
        const currBal = tx.current_balance != null ? Number(tx.current_balance) : (tx.currentBalance != null ? Number(tx.currentBalance) : null);
        return {
            id: tx.id,
            type: tx.type,
            date: tx.date,
            amount: tx.amount != null ? Number(tx.amount) : 0,
            currency: tx.currency || "INR",
            category: tx.category,
            method: tx.method,
            bank: tx.bank,
            bankName: tx.bank,
            bankAccountId: tx.bank_account_id || tx.bankAccountId || null,
            bank_account_id: tx.bank_account_id || tx.bankAccountId || null,
            bankAccount: tx.bank_account || tx.bankAccount || null,
            referenceId: tx.reference_id || tx.referenceId || null,
            reference_id: tx.reference_id || tx.referenceId || null,
            reference: tx.reference_id || tx.reference || null,
            description: tx.description,
            status: tx.status,
            previous_balance: prevBal,
            previousBalance: prevBal,
            current_balance: currBal,
            currentBalance: currBal,
        };
    });

    const sourceMilestones = Array.isArray(data.milestones_with_balances) && data.milestones_with_balances.length > 0
        ? data.milestones_with_balances
        : (Array.isArray(data.extra_installments) ? data.extra_installments : []);

    const extra = sourceMilestones.map((i, idx) => {
        const ref = i.transaction_id || `PAY-${data.id || 'new'}-${idx + 1}`;
        const matchedTx = transactions.find(t => 
            (t.reference_id && t.reference_id === ref) || 
            (t.reference && t.reference === ref) ||
            (i.transaction_id && (t.reference_id === i.transaction_id || t.reference === i.transaction_id))
        );

        const prevBal = i.previous_balance != null 
            ? Number(i.previous_balance) 
            : (matchedTx?.previous_balance != null ? Number(matchedTx.previous_balance) : null);
        const currBal = i.current_balance != null 
            ? Number(i.current_balance) 
            : (matchedTx?.current_balance != null ? Number(matchedTx.current_balance) : null);

        return {
            id: i.id || `inst_${data.id || 'new'}_${idx}`,
            date: i.date || "",
            amount: i.amount != null ? Number(i.amount) : 0,
            method: i.method || "Bank Account",
            bankAccountId: i.bank_account_id || null,
            bank_account_id: i.bank_account_id || null,
            bankName: i.bank_name || "",
            status: i.status || (Number(i.amount || 0) > 0 ? "Paid" : "Pending"),
            paidDate: i.paid_date || "",
            transactionId: i.transaction_id || "",
            note: i.note || "",
            previous_balance: prevBal,
            previousBalance: prevBal,
            current_balance: currBal,
            currentBalance: currBal,
        };
    });

    const isSplit = extra.length > 0 || data.payment_terms === 'Split Payment';

    const sortedTxns = [...transactions].sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
    const firstTx = sortedTxns.length > 0 ? sortedTxns[0] : null;
    const lastTx = sortedTxns.length > 0 ? sortedTxns[sortedTxns.length - 1] : null;

    const prevBal = data.previous_balance != null 
        ? Number(data.previous_balance) 
        : (data.previousBalance != null 
            ? Number(data.previousBalance) 
            : (firstTx?.previous_balance != null ? Number(firstTx.previous_balance) : null));

    const currBal = data.current_balance != null 
        ? Number(data.current_balance) 
        : (data.currentBalance != null 
            ? Number(data.currentBalance) 
            : (lastTx?.current_balance != null ? Number(lastTx.current_balance) : null));

    return {
        id: data.id,
        invoice_id: data.invoice_id,
        inv_id: data.inv_id,
        client: data.client,
        source: data.source,
        project: data.project,
        category: data.category,
        invoiceNo: data.invoice_no,
        amount: data.amount,
        currency: data.currency || "INR",
        method: data.method || "Bank Account",
        transactionId: data.transaction_id,
        bank: data.bank,
        bankAccountId: data.bank_account_id,
        bank_account_id: data.bank_account_id,
        bankAccount: data.bank_account,
        receivedDate: data.received_date,
        status: data.status || "Pending",
        gstApplied: data.gst_applied,
        gstPercent: data.gst_percent,
        gstAmount: data.gst_amount,
        netAmount: data.net_amount != null ? Number(data.net_amount) : (Number(data.amount || 0) - Number(data.discount_amount || 0) + Number(data.gst_amount || 0)),
        paidAmount: data.paid_amount != null ? Number(data.paid_amount) : 0,
        outstandingAmount: data.outstanding_amount != null ? Number(data.outstanding_amount) : 0,
        paymentType: isSplit ? 'split' : 'single',
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
        initial_deposit_bank_id: data.initial_deposit_bank_id,
        initialDepositBankName: data.initial_deposit_bank_name,
        extraInstallments: extra,
        createdAt: data.created_at,
        previous_balance: prevBal,
        previousBalance: prevBal,
        current_balance: currBal,
        currentBalance: currBal,
        source_description: data.source_description || data.sourceDescription || null,
        sourceDescription: data.source_description || data.sourceDescription || null,
        transactions,
        milestones_with_balances: data.milestones_with_balances,
    };
};

// Helper to clean data (empty strings -> null)
const clean = (val) => (val === "" || val === undefined ? null : val);

// Helper to transform Frontend data to API format
const toBackend = (data) => {
    const isSplit = data.paymentType === 'split';
    const isCash = String(data.method).toLowerCase() === 'cash';

    let initialDepositAmount = null;
    let initialDepositBankId = null;
    let extraInstallments = null;

    if (isSplit) {
        extraInstallments = Array.isArray(data.extraInstallments) ? data.extraInstallments.map((i) => {
            const amt = i.amount != null && i.amount !== "" ? parseFloat(i.amount) : null;
            return {
                id: i.id || undefined,
                date: clean(i.date),
                amount: amt,
                method: i.method || "Bank Account",
                bank_account_id: String(i.method).toLowerCase() === 'cash' ? null : (i.bankAccountId || null),
                bank_name: clean(i.bankName),
                status: (amt && amt > 0) ? "Paid" : (i.status || "Pending"),
                paid_date: clean(i.paidDate) || clean(i.date) || new Date().toISOString().split("T")[0],
                transaction_id: clean(i.transactionId),
                note: clean(i.note),
            };
        }) : [];
    } else {
        // Single payment: Amount Received is automatically equal to Total Value
        const netTotal = Math.max(0, (parseFloat(data.amount) || 0) - (parseFloat(data.discount) || 0) + (parseFloat(data.taxAmount) || 0));
        initialDepositAmount = netTotal;
        initialDepositBankId = isCash ? null : (data.bankAccountId || null);
    }

    return {
        client: clean(data.client),
        source: clean(data.source),
        project: clean(data.project),
        category: clean(data.category),
        invoice_no: clean(data.invoiceNo),
        amount: clean(data.amount),
        currency: clean(data.currency),
        method: data.method || 'Bank Account',
        transaction_id: clean(data.transactionId),
        bank: isCash ? 'Cash' : clean(data.bank),
        bank_account_id: isCash ? null : clean(data.bankAccountId),
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
        payment_terms: isSplit ? 'Split Payment' : 'Single Payment',
        discount_applied: clean(data.discountApplied),
        discount_amount: data.discount != null && data.discount !== "" ? parseFloat(data.discount) : null,
        late_fee: clean(data.lateFee),
        collection_status: clean(data.collectionStatus),
        followUpDate: clean(data.followUpDate),
        commission: clean(data.commission),
        tax_category: clean(data.taxCategory),
        initial_deposit_amount: initialDepositAmount,
        initial_deposit_bank_id: initialDepositBankId,
        extra_installments: extraInstallments,
    };
};

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
export const getIncomeSummary = async (filters = {}) => {
    const params = {};
    if (filters.search) params.search = filters.search;
    if (filters.status && filters.status !== 'All') params.status = filters.status;
    if (filters.category) params.category = filters.category;
    if (filters.bank_account_id) params.bank_account_id = filters.bank_account_id;
    if (filters.date_from) params.date_from = filters.date_from;
    if (filters.date_to) params.date_to = filters.date_to;
    const response = await api.get("/incomes/summary", { params });
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

/**
 * Record a payment against an income or milestone
 * POST /incomes/{id}/record-payment
 */
export const recordIncomePayment = async (id, paymentData) => {
    const response = await api.post(`/incomes/${id}/record-payment`, paymentData);
    return toFrontend(response.data);
};

/**
 * GET /incomes/{id} - fetch full single income with transactions
 */
export const getIncome = async (id) => {
    const response = await api.get(`/incomes/${id}`);
    return toFrontend(response.data);
};

