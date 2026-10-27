import api from "../api/axios";
import { apiFetchList } from "../utils/apiFetch";

// Transform API response to Frontend format
export const toFrontend = (data) => {
    if (!data) return null;
    return {
        id: data.id,
        name: data.name,
        jazno: data.jazno,
        date: data.date ? (typeof data.date === 'string' ? data.date.slice(0, 10) : data.date) : "",
        amount: data.amount,
        bankAccountId: data.bank_account_id,
        bankAccount: data.bank_account ? {
            id: data.bank_account.id,
            bankName: data.bank_account.bank_name,
            accountName: data.bank_account.account_name,
            accountNumber: data.bank_account.account_number,
            currency: data.bank_account.currency,
        } : null,
        status: data.status || "Received",
        notes: data.notes || "",
        income: data.income || null,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
    };
};

// Transform Frontend payload to API format
export const toBackend = (data) => ({
    name: data.name ? data.name.trim() : null,
    jazno: data.jazno ? data.jazno.trim() : null,
    date: data.date || null,
    amount: data.amount !== "" && data.amount != null ? parseFloat(data.amount) : 0,
    bank_account_id: data.bankAccountId ? parseInt(data.bankAccountId, 10) : null,
    status: data.status || "Received",
    notes: data.notes ? data.notes.trim() : null,
});

/**
 * Fetch list of INV records with optional filters.
 * Returns { data: [], meta: null|{} }
 */
export const getInvs = async (filters = {}) => {
    const params = {};
    if (filters.search && String(filters.search).trim() !== "") {
        params.search = String(filters.search).trim();
    }
    if (filters.status && filters.status !== "All" && filters.status !== "all") {
        params.status = filters.status;
    }
    if (filters.bankAccountId) {
        params.bank_account_id = filters.bankAccountId;
    }
    if (filters.dateFrom) {
        params.date_from = filters.dateFrom;
    }
    if (filters.dateTo) {
        params.date_to = filters.dateTo;
    }
    if (filters.page) {
        params.page = filters.page;
    }
    if (filters.perPage) {
        params.per_page = filters.perPage;
    }

    const result = await apiFetchList("/invs", { params, useCache: false });
    const arr = Array.isArray(result.data) ? result.data : [];
    const data = arr.map(toFrontend);
    return { data, meta: result.meta };
};

/**
 * Fetch a single INV record by ID.
 */
export const getInv = async (id) => {
    const response = await api.get(`/invs/${id}`);
    return toFrontend(response.data);
};

/**
 * Create a new INV record.
 */
export const createInv = async (invData) => {
    const response = await api.post("/invs", toBackend(invData));
    return toFrontend(response.data);
};

/**
 * Update an existing INV record.
 */
export const updateInv = async (id, invData) => {
    const response = await api.put(`/invs/${id}`, toBackend(invData));
    return toFrontend(response.data);
};

/**
 * Delete an INV record.
 */
export const deleteInv = async (id) => {
    await api.delete(`/invs/${id}`);
};
