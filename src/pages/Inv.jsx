import { useEffect, useState, useMemo, useRef } from "react";
import {
  Plus, Eye, Edit2, Trash2, Search, X, Landmark, Wallet,
  Calendar as CalendarIcon, CheckCircle2, Filter, Loader2,
  Building2, Hash, FileText, Check, ChevronDown, IndianRupee
} from "lucide-react";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";

import PageHeader from "../components/ui/PageHeader";
import EmptyState from "../components/ui/EmptyState";
import { FilterSelect, ClearFiltersButton } from "../components/ui/FilterControls";
import { TablePagination } from "../components/ui/DataTableSection";
import { ActionIconButton } from "../components/ui/TableRowActions";
import SlideOver from "../components/ui/SlideOver";
import { TableSkeleton } from "../components/Skeleton";

import { getInvs, createInv, updateInv, deleteInv } from "../services/invService";
import { getBankAccounts } from "../services/bankAccountService";
import { invalidateCache } from "../utils/apiFetch";
import { queryKeys } from "../query/queryKeys";

const emptyForm = {
  name: "",
  jazno: "",
  date: new Date().toISOString().slice(0, 10),
  amount: "",
  bankAccountId: "",
  notes: "",
  status: "Received",
};

/**
 * Custom Searchable Bank Account Dropdown
 */
function BankAccountSearchSelect({ bankAccounts = [], value, onChange, error }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef(null);

  const selectedAccount = useMemo(() => {
    return bankAccounts.find((b) => String(b.id) === String(value));
  }, [bankAccounts, value]);

  const filteredAccounts = useMemo(() => {
    if (!search.trim()) return bankAccounts;
    const term = search.toLowerCase();
    return bankAccounts.filter((b) =>
      (b.bankName && b.bankName.toLowerCase().includes(term)) ||
      (b.accountNumber && b.accountNumber.toLowerCase().includes(term)) ||
      (b.accountName && b.accountName.toLowerCase().includes(term)) ||
      (b.nickName && b.nickName.toLowerCase().includes(term))
    );
  }, [bankAccounts, search]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "w-full bg-slate-50 border rounded-xl px-4 py-3 text-[13px] font-bold flex items-center justify-between cursor-pointer transition-all shadow-sm select-none",
          isOpen ? "border-indigo-500 bg-white ring-4 ring-indigo-500/5" : "border-slate-200 hover:bg-slate-100/50",
          error && "border-rose-400 bg-rose-50/20"
        )}
      >
        {selectedAccount ? (
          <div className="flex items-center gap-2.5 truncate">
            <Landmark size={16} className="text-indigo-600 shrink-0" />
            <span className="text-slate-800 font-bold truncate">
              {selectedAccount.bankName} - {selectedAccount.accountNumber}
            </span>
            {selectedAccount.accountName && (
              <span className="text-slate-400 font-normal text-xs truncate">
                ({selectedAccount.accountName})
              </span>
            )}
          </div>
        ) : (
          <span className="text-slate-400 font-normal">Select a bank account (Optional)...</span>
        )}
        <div className="flex items-center gap-1.5 ml-2">
          {selectedAccount && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              className="p-1 hover:bg-slate-200/80 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
              title="Clear selection"
            >
              <X size={14} />
            </button>
          )}
          <ChevronDown size={16} className={clsx("text-slate-400 transition-transform duration-200", isOpen && "rotate-180")} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="p-2 border-b border-slate-100 bg-slate-50/60">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                autoFocus
                placeholder="Search by bank name or account #..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs font-medium outline-none focus:border-indigo-500"
              />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto divide-y divide-slate-50">
            <div
              onClick={() => {
                onChange("");
                setIsOpen(false);
                setSearch("");
              }}
              className={clsx(
                "px-4 py-2.5 flex items-center justify-between cursor-pointer text-xs transition-colors border-b border-slate-100",
                !value ? "bg-indigo-50/80 text-indigo-900 font-bold" : "hover:bg-slate-50 text-slate-500 italic"
              )}
            >
              <span className="text-slate-500 font-medium">None / No Bank Account</span>
              {!value && <Check size={16} className="text-indigo-600 shrink-0" />}
            </div>
            {filteredAccounts.length > 0 ? (
              filteredAccounts.map((account) => {
                const isSelected = String(account.id) === String(value);
                return (
                  <div
                    key={account.id}
                    onClick={() => {
                      onChange(account.id);
                      setIsOpen(false);
                      setSearch("");
                    }}
                    className={clsx(
                      "px-4 py-2.5 flex items-center justify-between cursor-pointer text-xs transition-colors",
                      isSelected ? "bg-indigo-50/80 text-indigo-900 font-bold" : "hover:bg-slate-50 text-slate-700"
                    )}
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">{account.bankName}</span>
                        <span className="text-slate-400 font-mono text-[11px]">• {account.accountNumber}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 mt-0.5">
                        {account.accountName} {account.accountType ? `(${account.accountType})` : ""}
                      </span>
                    </div>
                    {isSelected && <Check size={16} className="text-indigo-600 shrink-0" />}
                  </div>
                );
              })
            ) : (
              <div className="p-4 text-center text-xs text-slate-400 font-medium">
                No matching bank accounts found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Inv() {
  const queryClient = useQueryClient();

  // State
  const [records, setRecords] = useState([]);
  const [meta, setMeta] = useState(null);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [bankFilter, setBankFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("All");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Modals & Drawers
  const [openForm, setOpenForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // View drawer
  const [openView, setOpenView] = useState(false);
  const [viewItem, setViewItem] = useState(null);

  // Load Bank Accounts
  useEffect(() => {
    loadBankAccounts();
  }, []);

  const loadBankAccounts = async () => {
    try {
      const data = await getBankAccounts();
      setBankAccounts(data);
    } catch (err) {
      console.error("Failed to load bank accounts", err);
    }
  };

  // Load INV Data
  useEffect(() => {
    loadData();
  }, [searchQuery, statusFilter, bankFilter, dateFilter, currentPage]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Calculate date filters
      let dateFrom = "";
      let dateTo = "";
      const now = new Date();
      if (dateFilter === "Today") {
        dateFrom = now.toISOString().slice(0, 10);
        dateTo = dateFrom;
      } else if (dateFilter === "This Month") {
        dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
        dateTo = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
      } else if (dateFilter === "This Year") {
        dateFrom = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
        dateTo = new Date(now.getFullYear(), 11, 31).toISOString().slice(0, 10);
      }

      const res = await getInvs({
        search: searchQuery,
        status: statusFilter,
        bankAccountId: bankFilter,
        dateFrom,
        dateTo,
        page: currentPage,
        perPage: 20,
      });

      setRecords(res.data);
      setMeta(res.meta);
    } catch (err) {
      console.error("Failed to load INV records", err);
      toast.error("Failed to load INV records");
    } finally {
      setIsLoading(false);
    }
  };

  // Open Add Drawer
  const handleOpenAdd = () => {
    setForm({
      ...emptyForm,
      date: new Date().toISOString().slice(0, 10),
    });
    setErrors({});
    setEditId(null);
    setIsSaving(false);
    setOpenForm(true);
  };

  // Open Edit Drawer
  const handleOpenEdit = (item) => {
    setForm({
      name: item.name || "",
      jazno: item.jazno || "",
      date: item.date || new Date().toISOString().slice(0, 10),
      amount: item.amount != null ? String(item.amount) : "",
      bankAccountId: item.bankAccountId || (item.bankAccount ? item.bankAccount.id : ""),
      notes: item.notes || "",
      status: item.status || "Received",
    });
    setErrors({});
    setEditId(item.id);
    setIsSaving(false);
    setOpenForm(true);
  };

  // Open View Drawer
  const handleOpenView = (item) => {
    setViewItem(item);
    setOpenView(true);
  };

  // Form Validation - All fields are optional
  const validate = () => {
    const errs = {};
    if (form.amount !== "" && form.amount !== null && form.amount !== undefined) {
      const numAmount = parseFloat(form.amount);
      if (isNaN(numAmount) || numAmount < 0) {
        errs.amount = "Please enter a valid non-negative amount";
      }
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      const firstError = Object.values(errs)[0];
      toast.error(firstError);
      return false;
    }
    setErrors({});
    return true;
  };

  // Save INV (Create or Update)
  const handleSave = async () => {
    if (isSaving) return;
    if (!validate()) return;

    setIsSaving(true);
    try {
      const payload = {
        name: form.name?.trim() || "",
        jazno: form.jazno?.trim() || "",
        date: form.date || null,
        amount: form.amount !== "" && form.amount !== null && !isNaN(parseFloat(form.amount)) ? parseFloat(form.amount) : 0,
        bankAccountId: form.bankAccountId || null,
        notes: form.notes || "",
        status: form.status || "Received",
      };

      if (editId) {
        await updateInv(editId, payload);
        toast.success("INV record updated successfully");
      } else {
        await createInv(payload);
        toast.success("INV record created successfully");
      }

      // Close drawer
      setOpenForm(false);

      // Invalidate relevant caches and react-query keys for real-time reactivity
      invalidateCache("/invs");
      invalidateCache("/incomes");
      invalidateCache("/bank-accounts");
      invalidateCache("/transactions");
      queryClient.invalidateQueries({ queryKey: queryKeys.inv.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.income.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.bankAccounts() });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });

      // Refresh list
      loadData();
    } catch (err) {
      console.error("Failed to save INV", err);
      const msg = err.response?.data?.message || (editId ? "Failed to update INV" : "Failed to create INV");
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete INV
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this INV record? This will also remove the linked income entry and reverse the bank balance.")) {
      return;
    }

    try {
      await deleteInv(id);
      toast.success("INV record deleted successfully");

      // Invalidate caches & query keys
      invalidateCache("/invs");
      invalidateCache("/incomes");
      invalidateCache("/bank-accounts");
      invalidateCache("/transactions");
      queryClient.invalidateQueries({ queryKey: queryKeys.inv.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.income.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.bankAccounts() });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });

      loadData();
    } catch (err) {
      console.error("Failed to delete INV", err);
      const msg = err.response?.data?.message || "Failed to delete INV";
      toast.error(msg);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 animate-in fade-in duration-500 overflow-hidden">
      {/* Page Header */}
      <div className="px-6 lg:px-8 pt-8 pb-6 bg-white border-b border-slate-200/60 shadow-sm relative z-10">
        <PageHeader
          title="INV"
          subtitle="Manage and track your INV records and linked accounts."
          primaryAction={(
            <button
              onClick={handleOpenAdd}
              className="btn-primary flex items-center gap-2 shadow-lg shadow-indigo-500/20 group"
            >
              <div className="bg-white/20 p-1 rounded-lg group-hover:bg-white/30 transition-colors">
                <Plus size={16} />
              </div>
              <span>Add INV</span>
            </button>
          )}
        />
        {/* NOTE: Statistic cards intentionally excluded per requirement */}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0 bg-white">
        {/* Search & Filter Bar */}
        <div className="bg-slate-50/50 px-6 lg:px-8 py-3 border-b border-slate-100 flex flex-wrap items-center gap-3 sticky top-0 z-20">
          <div className="flex-1 min-w-[240px]">
            <div className="relative group">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors"
                size={16}
              />
              <input
                type="text"
                placeholder="Search by Name or Jazno..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-sm"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <FilterSelect icon={CheckCircle2} value={statusFilter} onChange={(val) => { setStatusFilter(val); setCurrentPage(1); }}>
              <option value="All">All Status</option>
              <option value="Received">Received</option>
            </FilterSelect>

            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={clsx(
                "p-2.5 border rounded-xl transition-all shadow-sm",
                showAdvancedFilters ? "bg-indigo-50 border-indigo-200 text-indigo-600" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              )}
              title="Advanced Filters"
            >
              <Filter size={18} />
            </button>

            {(searchQuery || statusFilter !== "All" || bankFilter || dateFilter !== "All") && (
              <ClearFiltersButton
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("All");
                  setBankFilter("");
                  setDateFilter("All");
                  setCurrentPage(1);
                }}
              />
            )}
          </div>
        </div>

        {/* Advanced Filters Drawer/Dropdown */}
        {showAdvancedFilters && (
          <div className="bg-white px-6 lg:px-8 py-5 border-b border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-2">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block">
                Bank Account
              </label>
              <select
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[13px] font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all"
                value={bankFilter}
                onChange={(e) => {
                  setBankFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">All Bank Accounts</option>
                {bankAccounts.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.bankName} - {b.accountNumber}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block">
                Date Range
              </label>
              <select
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[13px] font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all"
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="All">All Time</option>
                <option value="Today">Today</option>
                <option value="This Month">This Month</option>
                <option value="This Year">This Year</option>
              </select>
            </div>
          </div>
        )}

        {/* Table Section */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          <div className="min-w-full">
            <table className="w-full text-left border-collapse table-fixed">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 sticky top-0 z-10">
                  <th className="px-6 lg:px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-56">
                    Name
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-40">
                    Jazno
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-40">
                    Date
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right w-44">
                    Amount
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    Bank Account
                  </th>
                  <th className="px-6 lg:px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right w-36">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isLoading ? (
                  <tr>
                    <td colSpan="6" className="p-16 text-center text-slate-400 font-bold uppercase tracking-widest animate-pulse italic">
                      Synchronizing INV Registry...
                    </td>
                  </tr>
                ) : records.map((item) => (
                  <tr key={item.id} className="group hover:bg-slate-50/80 transition-all duration-200">
                    {/* Name Column */}
                    <td className="px-6 lg:px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl flex items-center justify-center text-[12px] font-black text-indigo-700 shadow-inner shrink-0">
                          {item.name?.[0]?.toUpperCase() || "I"}
                        </div>
                        <span className="text-[13px] font-black text-slate-900 truncate" title={item.name || ""}>
                          {item.name || <span className="text-slate-400 font-normal italic">—</span>}
                        </span>
                      </div>
                    </td>

                    {/* Jazno Column */}
                    <td className="px-6 py-5">
                      {item.jazno ? (
                        <span className="font-mono text-[12px] font-bold text-indigo-600 bg-indigo-50/80 border border-indigo-100 px-2.5 py-1 rounded-lg tracking-tight inline-block truncate max-w-full">
                          {item.jazno}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal text-xs italic">—</span>
                      )}
                    </td>

                    {/* Date Column */}
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-1.5 text-[12px] font-bold text-slate-700">
                        <CalendarIcon size={13} className="text-slate-400" />
                        <span>{item.date || "—"}</span>
                      </div>
                    </td>

                    {/* Amount Column */}
                    <td className="px-6 py-5 text-right">
                      <span className="font-mono text-[16px] font-black text-emerald-600 italic tracking-tight">
                        ₹{parseFloat(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>

                    {/* Bank Account Column */}
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 shrink-0">
                          <Landmark size={14} />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[12px] font-bold text-slate-800 truncate">
                            {item.bankAccount?.bankName || "Bank Account"}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono font-medium truncate">
                            {item.bankAccount?.accountNumber ? `Acct: ${item.bankAccount.accountNumber}` : ""}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Actions Column */}
                    <td className="px-6 lg:px-8 py-5 text-right">
                      <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                        <ActionIconButton
                          onClick={() => handleOpenView(item)}
                          title="View Details"
                          icon={Eye}
                          tone="view"
                        />
                        <ActionIconButton
                          onClick={() => handleOpenEdit(item)}
                          title="Edit Record"
                          icon={Edit2}
                          tone="edit"
                        />
                        <ActionIconButton
                          onClick={() => handleDelete(item.id)}
                          title="Delete Record"
                          icon={Trash2}
                          tone="delete"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Empty State */}
            {!isLoading && records.length === 0 && (
              <div className="p-20">
                <EmptyState
                  icon={FileText}
                  title="No INV records found"
                  description="Click 'Add INV' to record a new INV and synchronize it with Incomes."
                />
              </div>
            )}
          </div>
        </div>

        {/* Pagination Section */}
        {meta && meta.total > 0 && (
          <div className="bg-white border-t border-slate-100 px-6 lg:px-8 py-4 flex-shrink-0">
            <TablePagination
              summary={`Showing ${records.length} of ${meta.total} INV records`}
              onPrevious={() => setCurrentPage((p) => Math.max(1, p - 1))}
              onNext={() => setCurrentPage((p) => p + 1)}
              previousDisabled={meta.current_page <= 1}
              nextDisabled={meta.current_page >= meta.last_page}
            />
          </div>
        )}
      </div>

      {/* ADD / EDIT INV FORM SLIDEOVER (Matching New Bank Account layout & theme) */}
      <SlideOver
        isOpen={openForm}
        onClose={() => setOpenForm(false)}
        size="2xl"
        title={editId ? "Edit INV" : "New INV"}
        footer={(
          <div className="flex justify-end gap-3 w-full px-1">
            <button
              type="button"
              onClick={() => setOpenForm(false)}
              className="px-6 py-2.5 text-[14px] font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-10 py-2.5 bg-indigo-600 text-white text-[14px] font-black rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
            >
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              <span>{isSaving ? "Saving..." : (editId ? "Save Changes" : "Create INV")}</span>
            </button>
          </div>
        )}
      >
        <div className="space-y-6 pb-6 animate-in fade-in duration-200">
          {/* Header Banner */}
          <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100/80 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/20">
              <FileText size={20} />
            </div>
            <div>
              <p className="text-[13px] font-black text-slate-900 leading-tight">
                {editId ? "Modify INV Entry" : "Register New INV Record"}
              </p>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Amounts recorded here will automatically reflect in the Incomes module and credit the selected bank account.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Field 1: Name */}
            <div className="col-span-1 md:col-span-2">
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Name
              </label>
              <div className="relative">
                <Building2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="e.g. John Doe / Global Enterprises (Optional)"
                  value={form.name}
                  onChange={(e) => {
                    setForm({ ...form, name: e.target.value });
                    if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                  className={clsx(
                    "w-full bg-slate-50 border rounded-xl pl-11 pr-4 py-3 text-[13px] font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm",
                    errors.name ? "border-rose-400 bg-rose-50/20" : "border-slate-200"
                  )}
                />
              </div>
              {errors.name && (
                <p className="text-[10px] text-rose-500 mt-2 font-bold uppercase tracking-widest">
                  {errors.name}
                </p>
              )}
            </div>

            {/* Field 2: Jazno */}
            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Jazno
              </label>
              <div className="relative">
                <Hash size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="e.g. JAZ-2026-001 (Optional)"
                  value={form.jazno}
                  onChange={(e) => {
                    setForm({ ...form, jazno: e.target.value });
                    if (errors.jazno) setErrors((prev) => ({ ...prev, jazno: undefined }));
                  }}
                  className={clsx(
                    "w-full bg-slate-50 border rounded-xl pl-11 pr-4 py-3 text-[13px] font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm",
                    errors.jazno ? "border-rose-400 bg-rose-50/20" : "border-slate-200"
                  )}
                />
              </div>
              {errors.jazno && (
                <p className="text-[10px] text-rose-500 mt-2 font-bold uppercase tracking-widest">
                  {errors.jazno}
                </p>
              )}
            </div>

            {/* Field 3: Date */}
            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Date
              </label>
              <div className="relative">
                <CalendarIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => {
                    setForm({ ...form, date: e.target.value });
                    if (errors.date) setErrors((prev) => ({ ...prev, date: undefined }));
                  }}
                  className={clsx(
                    "w-full bg-slate-50 border rounded-xl pl-11 pr-4 py-3 text-[13px] font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm",
                    errors.date ? "border-rose-400 bg-rose-50/20" : "border-slate-200"
                  )}
                />
              </div>
              {errors.date && (
                <p className="text-[10px] text-rose-500 mt-2 font-bold uppercase tracking-widest">
                  {errors.date}
                </p>
              )}
            </div>

            {/* Field 4: Amount */}
            <div className="col-span-1 md:col-span-2">
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Amount (₹)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm pointer-events-none">
                  ₹
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00 (Optional)"
                  value={form.amount}
                  onChange={(e) => {
                    setForm({ ...form, amount: e.target.value });
                    if (errors.amount) setErrors((prev) => ({ ...prev, amount: undefined }));
                  }}
                  className={clsx(
                    "w-full bg-slate-50 border rounded-xl pl-11 pr-4 py-3 text-[14px] font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm font-mono",
                    errors.amount ? "border-rose-400 bg-rose-50/20" : "border-slate-200"
                  )}
                />
              </div>
              {errors.amount && (
                <p className="text-[10px] text-rose-500 mt-2 font-bold uppercase tracking-widest">
                  {errors.amount}
                </p>
              )}
            </div>

            {/* Field 5: Bank Account (Searchable dropdown) */}
            <div className="col-span-1 md:col-span-2">
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Bank Account
              </label>
              <BankAccountSearchSelect
                bankAccounts={bankAccounts}
                value={form.bankAccountId}
                onChange={(bankId) => {
                  setForm({ ...form, bankAccountId: bankId });
                  if (errors.bankAccountId) setErrors((prev) => ({ ...prev, bankAccountId: undefined }));
                }}
                error={errors.bankAccountId}
              />
              {errors.bankAccountId && (
                <p className="text-[10px] text-rose-500 mt-2 font-bold uppercase tracking-widest">
                  {errors.bankAccountId}
                </p>
              )}
            </div>
          </div>
        </div>
      </SlideOver>

      {/* VIEW DETAILS SLIDEOVER */}
      <SlideOver
        isOpen={openView}
        onClose={() => setOpenView(false)}
        size="xl"
        title="INV Details"
        footer={(
          <div className="flex justify-between items-center w-full px-1">
            <button
              onClick={() => {
                setOpenView(false);
                if (viewItem) handleOpenEdit(viewItem);
              }}
              className="px-5 py-2.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-[13px] font-bold flex items-center gap-2 transition-all"
            >
              <Edit2 size={15} />
              <span>Edit INV</span>
            </button>
            <button
              onClick={() => setOpenView(false)}
              className="px-6 py-2.5 bg-slate-900 text-white text-[13px] font-bold rounded-xl hover:bg-black transition-all"
            >
              Close
            </button>
          </div>
        )}
      >
        {viewItem && (
          <div className="space-y-6 pb-6 animate-in fade-in duration-200">
            {/* Amount Banner */}
            <div className="p-6 bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 rounded-2xl text-white shadow-xl flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-indigo-200 uppercase tracking-wider">
                  Total Recorded Amount
                </p>
                <p className="text-3xl font-black font-mono tracking-tight text-white mt-1">
                  ₹{parseFloat(viewItem.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                    {viewItem.status || "Received"}
                  </span>
                  <span className="text-xs text-indigo-200/70 font-mono">
                    Ref: {viewItem.jazno || "—"}
                  </span>
                </div>
              </div>
              <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-white/90 shrink-0">
                <Wallet size={28} />
              </div>
            </div>

            {/* Information Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  Name / Client
                </p>
                <p className="text-[14px] font-bold text-slate-900">
                  {viewItem.name || "—"}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  Jazno
                </p>
                <span className="font-mono text-[12px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg">
                  {viewItem.jazno || "—"}
                </span>
              </div>

              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  Transaction Date
                </p>
                <p className="text-[13px] font-bold text-slate-800 flex items-center gap-1.5">
                  <CalendarIcon size={14} className="text-slate-400" />
                  {viewItem.date}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  Bank Account
                </p>
                <p className="text-[13px] font-bold text-slate-800">
                  {viewItem.bankAccount?.bankName || "—"}
                </p>
                {viewItem.bankAccount?.accountNumber && (
                  <p className="text-xs text-slate-500 font-mono">
                    Acct: {viewItem.bankAccount.accountNumber}
                  </p>
                )}
              </div>

              {viewItem.bankAccount?.accountName && (
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Account Holder
                  </p>
                  <p className="text-[13px] font-semibold text-slate-800">
                    {viewItem.bankAccount.accountName}
                  </p>
                </div>
              )}

              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  Incomes Link Status
                </p>
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                  <CheckCircle2 size={14} />
                  <span>Synchronized with Incomes</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </SlideOver>
    </div>
  );
}
