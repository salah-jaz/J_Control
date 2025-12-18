import { useEffect, useState } from "react";
import { Plus, Eye, Edit2, Trash2, X } from "lucide-react";

const STORAGE_KEY = "bank_accounts";

const emptyForm = {
  bankName: "",
  accountName: "",
  nickName: "",
  accountType: "Savings",

  accountNumber: "",
  ifsc: "",
  branch: "",
  micr: "",
  swift: "",

  openingBalance: "",
  currency: "INR",
  status: "Active",
  openingDate: "",

  notes: "",
};

const tabs = ["Basic Info", "Bank Details", "Balance & Status", "Notes"];

export default function BankAccounts() {
  const [data, setData] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [openForm, setOpenForm] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    setData(JSON.parse(localStorage.getItem(STORAGE_KEY)) || []);
  }, []);

  const syncStorage = (records) => {
    setData(records);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  };

  const openAdd = () => {
    setForm(emptyForm);
    setErrors({});
    setEditIndex(null);
    setActiveTab(0);
    setOpenForm(true);
  };

  const openEdit = (item, index) => {
    setForm(item);
    setEditIndex(index);
    setErrors({});
    setActiveTab(0);
    setOpenForm(true);
  };

  const openViewModal = (item) => {
    setViewItem(item);
    setOpenView(true);
  };

  /* ✅ FIX 2: DELETE */
  const deleteBankaccounts = (index) => {
    if (!window.confirm("Delete this bank account?")) return;
    const updated = data.filter((_, i) => i !== index);
    syncStorage(updated);
  };

  const validate = () => {
    const e = {};
    if (!form.bankName) e.bankName = true;
    if (!form.accountName) e.accountName = true;
    if (!form.accountNumber) e.accountNumber = true;
    if (!form.ifsc) e.ifsc = true;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const saveAccount = () => {
    if (!validate()) return;
    const updated = [...data];
    editIndex !== null ? (updated[editIndex] = form) : updated.push(form);
    syncStorage(updated);
    setOpenForm(false);
  };

  const input = (name, type = "text") => (
    <input
      type={type}
      value={form[name]}
      onChange={(e) => setForm({ ...form, [name]: e.target.value })}
      className={`input ${errors[name] ? "border-red-500" : ""}`}
    />
  );

  const Req = () => <span className="text-red-500 ml-1">*</span>;

  return (
    <div className="p-6 space-y-6 font-sans">
      {/* HEADER */}
      <div className="flex justify-between">
        <h1 className="text-2xl font-semibold">Bank Accounts</h1>
        <button
          onClick={openAdd}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          + Add Bank
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50/50 text-xs text-gray-500 uppercase border-b border-gray-1006">
            <tr>
              <th className="p-4 text-left">Bank</th>
              <th className="p-4 text-left">Account</th>
              <th className="p-4 text-left">Type</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-10 text-center text-gray-400">
                  No bank accounts found
                </td>
              </tr>
            ) : (
              data.map((item, i) => (
                <tr key={i} className="border-t hover:bg-gray-50">
                  <td className="p-4 font-medium">{item.bankName}</td>
                  <td className="p-4">{item.accountName}</td>
                  <td className="p-4">{item.accountType}</td>
                  <td className="p-4">
                    <span
                      className={`badge ${
                        item.status === "Active" ? "badge-green" : "badge-gray"
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-center gap-3">
                      {/* VIEW */}
                      <button
                        onClick={() => openViewModal(item)}
                        title="View"
                        className="p-2 rounded-lg text-sky-600 hover:bg-sky-50 transition"
                      >
                        <Eye size={18} />
                      </button>

                      {/* EDIT */}
                      <button
                        onClick={() => openEdit(item, i)}
                        title="Edit"
                        className="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 transition"
                      >
                        <Edit2 size={18} />
                      </button>

                      {/* DELETE */}
                      <button
                        onClick={() => deleteBankaccounts(i)}
                        title="Delete"
                        className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* VIEW MODAL */}
      {openView && viewItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-2xl rounded-xl p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Bank Account Details</h2>
              <button
                onClick={() => setOpenView(false)}
                className="p-2 rounded hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <b>Bank Name:</b> {viewItem.bankName}
              </div>
              <div>
                <b>Account Name:</b> {viewItem.accountName}
              </div>
              <div>
                <b>Nick Name:</b> {viewItem.nickName || "-"}
              </div>
              <div>
                <b>Account Type:</b> {viewItem.accountType}
              </div>

              <div>
                <b>Account No:</b> {viewItem.accountNumber}
              </div>
              <div>
                <b>IFSC:</b> {viewItem.ifsc}
              </div>
              <div>
                <b>Branch:</b> {viewItem.branch || "-"}
              </div>
              <div>
                <b>MICR:</b> {viewItem.micr || "-"}
              </div>
              <div>
                <b>SWIFT:</b> {viewItem.swift || "-"}
              </div>

              <div>
                <b>Status:</b> {viewItem.status}
              </div>
              <div>
                <b>Currency:</b> {viewItem.currency}
              </div>
              <div>
                <b>Opening Balance:</b> {viewItem.openingBalance || "-"}
              </div>
              <div>
                <b>Opening Date:</b> {viewItem.openingDate || "-"}
              </div>

              <div className="col-span-2">
                <b>Notes:</b>
                <p className="mt-1 text-gray-600">{viewItem.notes || "-"}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FORM MODAL */}
      {openForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-4xl rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">
              {editIndex !== null ? "Edit Bank Account" : "Add Bank Account"}
            </h2>

            {/* TABS */}
            <div className="flex border-b mb-6">
              {tabs.map((t, i) => (
                <button
                  key={i}
                  onClick={() => setActiveTab(i)}
                  className={`px-4 py-2 font-semibold ${
                    activeTab === i
                      ? "border-b-2 border-indigo-600 text-indigo-600"
                      : "text-gray-500"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* TAB CONTENT */}
            {activeTab === 0 && (
              <div className="grid grid-cols-2 gap-5 text-sm font-semibold">
                <label>
                  Bank Name
                  <Req />
                  {input("bankName")}
                </label>
                <label>
                  Account Holder Name
                  <Req />
                  {input("accountName")}
                </label>
                <label>Nick Name{input("nickName")}</label>
                <label>
                  Account Type
                  <select
                    className="input"
                    value={form.accountType}
                    onChange={(e) =>
                      setForm({ ...form, accountType: e.target.value })
                    }
                  >
                    <option>Savings</option>
                    <option>Current</option>
                  </select>
                </label>
              </div>
            )}

            {activeTab === 1 && (
              <div className="grid grid-cols-2 gap-5 text-sm font-semibold">
                <label>
                  Account Number
                  <Req />
                  {input("accountNumber")}
                </label>
                <label>
                  IFSC Code
                  <Req />
                  {input("ifsc")}
                </label>
                <label>Branch{input("branch")}</label>
                <label>MICR Code{input("micr")}</label>
                <label>SWIFT Code{input("swift")}</label>
              </div>
            )}

            {activeTab === 2 && (
              <div className="grid grid-cols-2 gap-5 text-sm font-semibold">
                <label>
                  Opening Balance{input("openingBalance", "number")}
                </label>
                <label>Currency{input("currency")}</label>
                <label>
                  Status
                  <select
                    className="input"
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value })
                    }
                  >
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                </label>
                <label>Opening Date{input("openingDate", "date")}</label>
              </div>
            )}

            {activeTab === 3 && (
              <textarea
                className="input h-28 w-full"
                placeholder="Internal notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setOpenForm(false)}
                className="px-6 py-2 text-gray-500 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={saveAccount}
                className="bg-indigo-600 text-white px-8 py-2 rounded-lg font-bold shadow-md hover:bg-indigo-700 transition-all"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
