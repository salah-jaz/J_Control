import { useEffect, useState } from "react";
import { Eye, Edit2, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { getIncomes, createIncome, updateIncome, deleteIncome } from "../services/incomeService";
import { getBankAccounts } from "../services/bankAccountService";
import { getClients } from "../services/db";

const emptyForm = {
  client: "",
  source: "",
  project: "",
  category: "",
  invoiceNo: "",
  amount: "",
  currency: "INR",

  method: "",
  transactionId: "",
  bank: "",
  receivedDate: "",
  status: "Received",

  gstApplied: "No",
  gstPercent: "18",
  gstAmount: "",
  netAmount: "",

  staff: "",
  department: "",
  notes: "",
};

export default function Income() {
  const [data, setData] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [tab, setTab] = useState("basic");

  const [openForm, setOpenForm] = useState(false);
  const [openView, setOpenView] = useState(false);

  const [editId, setEditId] = useState(null);
  const [viewItem, setViewItem] = useState(null);

  /* LOAD */
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const records = await getIncomes();
      setData(records);
      const banks = await getBankAccounts();
      setBankAccounts(banks);
      const clientsData = await getClients();
      setClients(clientsData);
    } catch (e) {
      console.error("Failed to load data", e);
    }
  };

  /* AUTO-CALCULATE TAX */
  useEffect(() => {
    const baseAmount = parseFloat(form.amount) || 0;
    if (form.gstApplied === "Yes") {
      const percent = parseFloat(form.gstPercent) || 0;
      const calculatedGst = (baseAmount * percent) / 100;
      const total = baseAmount + calculatedGst;
      setForm((prev) => ({
        ...prev,
        gstAmount: calculatedGst.toFixed(2),
        netAmount: total.toFixed(2),
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        gstAmount: "0",
        netAmount: baseAmount.toFixed(2),
      }));
    }
  }, [form.amount, form.gstApplied, form.gstPercent]);

  const openAdd = () => {
    setForm(emptyForm);
    setErrors({});
    setEditId(null);
    setTab("basic");
    setOpenForm(true);
  };

  const openEdit = (item) => {
    setForm(item);
    setErrors({});
    setEditId(item.id);
    setTab("basic");
    setOpenForm(true);
  };

  const openViewModal = (item) => {
    setViewItem(item);
    setOpenView(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this income record?")) return;
    try {
      await deleteIncome(id);
      toast.success("Income record deleted successfully");
      loadData();
    } catch (e) {
      toast.error("Failed to delete record");
    }
  };

  const validate = () => {
    const e = {};
    if (!form.client) e.client = "Client is required";
    if (!form.source) e.source = "Income source is required";
    if (!form.amount) e.amount = "Amount is required";
    if (!form.method) e.method = "Payment method is required";
    if (!form.receivedDate) e.receivedDate = "Received date is required";
    if (!form.status) e.status = "Status is required";

    if (form.method !== "Cash" && !form.transactionId) {
      e.transactionId = "Transaction ID is required for non-cash payments";
    }

    if (Object.keys(e).length > 0) {
      setErrors(e);
      // Show first error or generic message
      const firstError = Object.values(e)[0];
      toast.error(Object.keys(e).length > 1 ? `Please fix validation errors. ${firstError}` : firstError);
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;

    try {
      if (editId) {
        await updateIncome(editId, form);
        toast.success("Income updated successfully");
      } else {
        await createIncome(form);
        toast.success("Income added successfully");
      }
      await loadData();
      setOpenForm(false);
    } catch (e) {
      console.error("Failed to save", e);
      if (e.response && e.response.data && e.response.data.errors) {
        setErrors(e.response.data.errors);
        toast.error("Server validation failed. Please check the form.");
      } else {
        toast.error("Failed to save record: " + (e.message || "Unknown error"));
      }
    }
  };

  const inputClass = (f) => `input ${errors[f] ? "border-red-500" : ""}`;

  const Req = () => <span className="text-red-500 ml-1">*</span>;

  return (
    <div className="p-6 space-y-6 font-sans">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Income</h1>
        <button
          onClick={openAdd}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          + Add Income
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow overflow-x-auto border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50/50 text-xs text-gray-500 uppercase border-b border-gray-100">
            <tr>
              <th className="p-4 text-left font-semibold">Client</th>
              <th className="p-4 text-left font-semibold">Source</th>
              <th className="p-4 text-left font-semibold">Amount</th>
              <th className="p-4 text-left font-semibold">Method</th>
              <th className="p-4 text-left font-semibold">Date</th>
              <th className="p-4 text-center font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-10 text-center text-gray-500">
                  No income records found
                </td>
              </tr>
            ) : (
              data.map((item, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="p-4">{item.client}</td>
                  <td className="p-4 text-gray-600">{item.source}</td>
                  <td className="p-4 font-bold text-gray-900">
                    ₹{item.amount}
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                      {item.method}
                    </span>
                  </td>
                  <td className="p-4 text-gray-600">{item.receivedDate}</td>
                  <td className="p-4 text-center">
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
                        onClick={() => openEdit(item)}
                        title="Edit"
                        className="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 transition"
                      >
                        <Edit2 size={18} />
                      </button>

                      {/* DELETE */}
                      <button
                        onClick={() => handleDelete(item.id)}
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
          <div className="bg-white max-w-2xl w-full rounded-xl p-8 shadow-2xl">
            <h2 className="text-xl font-bold mb-6 border-b pb-2">
              Record Details
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-sm">
              {Object.entries(viewItem).map(([k, v]) => (
                <div key={k} className="flex flex-col">
                  <p className="text-gray-400 uppercase text-[10px] font-bold tracking-wider">
                    {k}
                  </p>
                  <p className="font-semibold text-gray-800">{v || "-"}</p>
                </div>
              ))}
            </div>
            <div className="text-right mt-8">
              <button
                onClick={() => setOpenView(false)}
                className="px-6 py-2 bg-gray-100 rounded-lg font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FORM MODAL */}
      {openForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-5xl rounded-xl p-8 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <h2 className="text-xl font-bold mb-4">
              {editId ? "Edit Income Record" : "Add New Income"}
            </h2>

            {/* TABS */}
            <div className="flex gap-1 border-b mb-6">
              {["basic", "payment", "tax", "internal"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-6 py-2 text-sm font-semibold uppercase tracking-tight rounded-t-lg transition-all ${tab === t
                    ? "bg-indigo-600 text-white"
                    : "text-gray-400 hover:text-gray-600"
                    }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* FORM CONTENT */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 overflow-y-auto  p-4">
              {tab === "basic" && (
                <>
                  <label className="text-sm font-semibold">
                    Client
                    <Req />
                    <select
                      className={inputClass("client")}
                      value={form.client}
                      onChange={(e) =>
                        setForm({ ...form, client: e.target.value })
                      }
                    >
                      <option value="">Select Client</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.company_name}>
                          {c.company_name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm font-semibold">
                    Income Source
                    <Req />
                    <input
                      className={inputClass("source")}
                      value={form.source}
                      onChange={(e) =>
                        setForm({ ...form, source: e.target.value })
                      }
                    />
                  </label>
                  <label className="text-sm font-semibold">
                    Project / Service
                    <input
                      className="input"
                      value={form.project}
                      onChange={(e) =>
                        setForm({ ...form, project: e.target.value })
                      }
                    />
                  </label>
                  <label className="text-sm font-semibold">
                    Category
                    <input
                      className="input"
                      value={form.category}
                      onChange={(e) =>
                        setForm({ ...form, category: e.target.value })
                      }
                    />
                  </label>
                  <label className="text-sm font-semibold">
                    Invoice No
                    <input
                      className="input"
                      value={form.invoiceNo}
                      onChange={(e) =>
                        setForm({ ...form, invoiceNo: e.target.value })
                      }
                    />
                  </label>
                  <label className="text-sm font-semibold">
                    Base Amount (₹)
                    <Req />
                    <input
                      type="number"
                      className={inputClass("amount")}
                      value={form.amount}
                      onChange={(e) =>
                        setForm({ ...form, amount: e.target.value })
                      }
                    />
                  </label>
                </>
              )}

              {tab === "payment" && (
                <>
                  <label className="text-sm font-semibold">
                    Payment Method
                    <Req />
                    <select
                      className={inputClass("method")}
                      value={form.method}
                      onChange={(e) =>
                        setForm({ ...form, method: e.target.value })
                      }
                    >
                      <option value="">Select Method</option>
                      <option>Bank Transfer</option>
                      <option>UPI</option>
                      <option>Cash</option>
                      <option>Cheque</option>
                    </select>
                  </label>
                  <label className="text-sm font-semibold">
                    Transaction / UTR ID
                    <input
                      className={inputClass("transactionId")}
                      value={form.transactionId}
                      onChange={(e) =>
                        setForm({ ...form, transactionId: e.target.value })
                      }
                    />
                  </label>
                  <label className="text-sm font-semibold">
                    Bank / Wallet Name
                    <select
                      className="input"
                      value={form.bank}
                      onChange={(e) =>
                        setForm({ ...form, bank: e.target.value })
                      }
                    >
                      <option value="">Select Bank / Wallet</option>
                      {bankAccounts.map((b) => (
                        <option key={b.id} value={`${b.bankName} - ${b.accountNumber}`}>
                          {b.bankName} - {b.accountNumber}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm font-semibold">
                    Received Date
                    <Req />
                    <input
                      type="date"
                      className={inputClass("receivedDate")}
                      value={form.receivedDate}
                      onChange={(e) =>
                        setForm({ ...form, receivedDate: e.target.value })
                      }
                    />
                  </label>
                  <label className="text-sm font-semibold">
                    Payment Status
                    <Req />
                    <select
                      className={inputClass("status")}
                      value={form.status}
                      onChange={(e) =>
                        setForm({ ...form, status: e.target.value })
                      }
                    >
                      <option>Received</option>
                      <option>Pending</option>
                    </select>
                  </label>
                </>
              )}

              {tab === "tax" && (
                <>
                  <label className="text-sm font-semibold">
                    Apply GST?
                    <select
                      className="input"
                      value={form.gstApplied}
                      onChange={(e) =>
                        setForm({ ...form, gstApplied: e.target.value })
                      }
                    >
                      <option>No</option>
                      <option>Yes</option>
                    </select>
                  </label>
                  {form.gstApplied === "Yes" && (
                    <label className="text-sm font-semibold">
                      GST Percent (%)
                      <input
                        type="number"
                        className="input"
                        value={form.gstPercent}
                        onChange={(e) =>
                          setForm({ ...form, gstPercent: e.target.value })
                        }
                      />
                    </label>
                  )}
                  <div className="md:col-span-2 grid grid-cols-2 gap-4 mt-2 p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <div>
                      <p className="text-xs text-gray-500 font-bold uppercase">
                        GST Amount
                      </p>
                      <p className="text-lg font-bold text-gray-800">
                        ₹{form.gstAmount || "0.00"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-bold uppercase">
                        Net Total (Amount + GST)
                      </p>
                      <p className="text-lg font-bold text-indigo-600">
                        ₹{form.netAmount || "0.00"}
                      </p>
                    </div>
                  </div>
                </>
              )}

              {tab === "internal" && (
                <>
                  <label className="text-sm font-semibold">
                    Account Manager / Staff
                    <input
                      className="input"
                      placeholder="Name of staff"
                      value={form.staff}
                      onChange={(e) =>
                        setForm({ ...form, staff: e.target.value })
                      }
                    />
                  </label>
                  <label className="text-sm font-semibold">
                    Department
                    <input
                      className="input"
                      placeholder="Sales / Ops"
                      value={form.department}
                      onChange={(e) =>
                        setForm({ ...form, department: e.target.value })
                      }
                    />
                  </label>
                  <label className="text-sm font-semibold md:col-span-2">
                    Internal Notes
                    <textarea
                      className="input h-32 pt-2"
                      placeholder="Add specific details about this transaction..."
                      value={form.notes}
                      onChange={(e) =>
                        setForm({ ...form, notes: e.target.value })
                      }
                    />
                  </label>
                </>
              )}
            </div>

            {/* FOOTER */}
            <div className="flex justify-end gap-3 mt-8 pt-4 border-t">
              <button
                onClick={() => setOpenForm(false)}
                className="px-6 py-2 text-gray-500 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="bg-indigo-600 text-white px-8 py-2 rounded-lg font-bold shadow-md hover:bg-indigo-700 transition-all"
              >
                Save Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
