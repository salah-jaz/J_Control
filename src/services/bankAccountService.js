
import api from "../api/axios";

// Helper to transform API data to Frontend format
const toFrontend = (data) => ({
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
    currency: data.currency,
    status: data.status,
    openingDate: data.opening_date,
    notes: data.notes,
    createdAt: data.created_at,
});

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
    currency: clean(data.currency),
    status: clean(data.status),
    opening_date: clean(data.openingDate),
    notes: clean(data.notes),
});

export const getBankAccounts = async () => {
    const response = await api.get("/bank-accounts");
    return response.data.map(toFrontend);
};

export const createBankAccount = async (account) => {
    const response = await api.post("/bank-accounts", toBackend(account));
    return toFrontend(response.data);
};

export const updateBankAccount = async (id, account) => {
    const response = await api.put(`/bank-accounts/${id}`, toBackend(account));
    return toFrontend(response.data);
};

export const deleteBankAccount = async (id) => {
    await api.delete(`/bank-accounts/${id}`);
};
