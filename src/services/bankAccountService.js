import api, { getApiOrigin } from "../api/axios";
import { apiFetchList } from "../utils/apiFetch";

// Helper to resolve storage paths
const resolveUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const origin = getApiOrigin();
    return `${origin}/storage/${path.replace(/^\/+/, '')}`;
};

// Helper to transform API data to Frontend format
const toFrontend = (data) => {
    const mapped = {
        id: data.id,
        bankName: data.bank_name,
        accountName: data.account_name,
        nickName: data.nick_name,
        accountType: data.account_type,
        accountNumber: data.account_number,
        ifsc: data.ifsc_code,
        branch: data.branch_name,
        micr: data.micr_code,
        swift: data.swift_code,
        openingBalance: data.opening_balance,
        currentBalance: data.current_balance,
        currency: data.currency,
        status: data.status,
        isDefault: Boolean(data.is_default),
        openingDate: data.opening_date,
        notes: data.notes,
        qrCode: resolveUrl(data.qr_code),
        createdAt: data.created_at,
    };
    return mapped;
};

const clean = (val) => (val === "" || val === undefined ? null : val);

// Helper to transform Frontend data to API format
const toBackend = (data) => ({
    bank_name: clean(data.bankName),
    account_name: clean(data.accountName),
    nick_name: clean(data.nickName),
    account_type: clean(data.accountType),
    account_number: clean(data.accountNumber),
    ifsc_code: clean(data.ifsc),
    branch_name: clean(data.branch),
    micr_code: clean(data.micr),
    swift_code: clean(data.swift),
    opening_balance: clean(data.openingBalance),
    current_balance: clean(data.currentBalance),
    currency: clean(data.currency),
    status: clean(data.status),
    is_default: data.isDefault ? 1 : 0,
    opening_date: clean(data.openingDate),
    notes: clean(data.notes),
});

export const getBankAccounts = async ({ useCache = true } = {}) => {
    const result = await apiFetchList("/bank-accounts", { useCache });
    const arr = Array.isArray(result.data) ? result.data : [];
    return arr.map(toFrontend);
};

export const createBankAccount = async (account) => {
    const data = toBackend(account);
    const formData = new FormData();
    Object.keys(data).forEach(key => {
        if (data[key] !== null) formData.append(key, data[key]);
    });
    if (account.qrCodeFile) {
        formData.append('qr_code', account.qrCodeFile);
    }
    // Handle Method Spoofing if needed, but for POST it's fine.

    const response = await api.post("/bank-accounts", formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return toFrontend(response.data);
};

export const updateBankAccount = async (id, account) => {
    const data = toBackend(account);
    const formData = new FormData();
    Object.keys(data).forEach(key => {
        if (data[key] !== null) formData.append(key, data[key]);
    });
    if (account.qrCodeFile) {
        formData.append('qr_code', account.qrCodeFile);
    }
    // Laravel PUT with FormData usually requires _method: PUT
    formData.append('_method', 'PUT');

    const response = await api.post(`/bank-accounts/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return toFrontend(response.data);
};

export const deleteBankAccount = async (id) => {
    await api.delete(`/bank-accounts/${id}`);
};

/**
 * Set a bank account as the default.
 * Clears the default flag from all others on the server side.
 */
export const setDefaultBankAccount = async (id) => {
    const response = await api.post(`/bank-accounts/${id}/set-default`);
    return toFrontend(response.data.bank || response.data);
};
