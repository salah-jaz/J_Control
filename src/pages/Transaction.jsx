import React, { useEffect, useState, useMemo } from "react";
import { Search, Download, ArrowUpRight, ArrowDownLeft, Filter, X, Eye, Receipt, TrendingUp, TrendingDown, Activity } from "lucide-react";
import clsx from "clsx";
import { exportToCSV } from "../utils/csvExport";
import { useTransactionList, useTransactionSummary } from "../hooks/useApiQueries";
import { getBankAccounts } from "../services/bankAccountService";
import { TableSkeleton } from "../components/Skeleton";

const StatCard = ({ title, value, icon: Icon, color }) => (
  <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">{title}</p>
        <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{value}</p>
      </div>
      <div className={`flex-shrink-0 p-3 rounded-xl ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  </div>
);

export default function Transaction() {
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [bankFilter, setBankFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewDetail, setViewDetail] = useState(null);

  const filters = useMemo(
    () => ({
      search: searchDebounced.trim() || undefined,
      type: typeFilter || undefined,
      status: statusFilter || undefined,
      bank_account_id: bankFilter || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      page: currentPage,
      per_page: 20,
    }),
    [searchDebounced, typeFilter, statusFilter, bankFilter, dateFrom, dateTo, currentPage]
  );

  const { data: listResult, isLoading: listLoading } = useTransactionList(filters);

  const summaryFilters = useMemo(() => {
    const { page, per_page, ...rest } = filters;
    return rest;
  }, [filters]);

  const { data: summary } = useTransactionSummary(summaryFilters);

  const transactions = Array.isArray(listResult?.data) ? listResult.data : [];
  const listMeta = listResult?.meta ?? null;

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchDebounced, typeFilter, statusFilter, bankFilter, dateFrom, dateTo]);

  useEffect(() => {
    getBankAccounts()
      .then((b) => setBankAccounts(Array.isArray(b) ? b : []))
      .catch(() => setBankAccounts([]));
  }, []);

  const openViewModal = (item) => {
    if (!item?.id) return;
    setViewDetail(item);
    setViewModalOpen(true);
  };

  const displayStatus = (txn) => txn?.incomeStatus || txn?.status || "—";

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto animate-fade-in space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Transactions</h1>
          <p className="text-slate-500 mt-1 text-base md:text-lg">History of all financial movements.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={clsx("btn-secondary flex items-center gap-2", showFilters && "bg-slate-100 ring-2 ring-slate-200")}
          >
            <Filter size={18} />
            Filter
          </button>
          <button
            onClick={() => exportToCSV(transactions, "transactions_export")}
            className="btn-secondary flex items-center gap-2"
          >
            <Download size={18} />
            Export
          </button>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <StatCard
          title="Total Transactions"
          value={summary?.totalTransactions ?? "—"}
          icon={Receipt}
          color="bg-slate-600"
        />
        <StatCard
          title="Total Income"
          value={summary?.totalIncome != null ? `₹${Number(summary.totalIncome).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
          icon={TrendingUp}
          color="bg-emerald-600"
        />
        <StatCard
          title="Total Expense"
          value={summary?.totalExpense != null ? `₹${Number(summary.totalExpense).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
          icon={TrendingDown}
          color="bg-red-600"
        />
        <StatCard
          title="Recent (7 days)"
          value={summary?.recentCount ?? "—"}
          icon={Activity}
          color="bg-brand-600"
        />
      </div>

      {/* FILTER PANEL */}
      {showFilters && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-slide-up">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Filter size={16} className="text-brand-600" />
              Filter Records
            </h3>
            <button
              onClick={() => {
                setTypeFilter("");
                setStatusFilter("");
                setBankFilter("");
                setDateFrom("");
                setDateTo("");
              }}
              className="text-sm text-brand-600 font-bold hover:underline"
            >
              Reset Filters
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="label">Type</label>
              <select className="input" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="">All</option>
                <option value="Income">Income</option>
                <option value="Expense">Expense</option>
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All</option>
                <option value="Paid">Paid</option>
                <option value="Received">Received</option>
                <option value="Pending">Pending</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="label">Bank/Treasury</label>
              <select className="input" value={bankFilter} onChange={(e) => setBankFilter(e.target.value)}>
                <option value="">All</option>
                {bankAccounts.map((b) => (
                  <option key={b.id} value={b.id}>{b.bank_name || b.bankName} - {b.account_number || b.accountNumber}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Start Date</label>
              <input type="date" className="input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="label">End Date</label>
              <input type="date" className="input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {/* TABLE */}
      <div className="card p-0 overflow-hidden min-h-[400px]">
        <div className="px-4 md:px-6 py-4 md:py-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50/50">
          <h3 className="font-bold text-slate-800">Transaction History</h3>
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 w-full sm:w-64 transition-all"
            />
          </div>
        </div>
        <div className="px-4 md:px-6 py-2 border-b border-gray-100 bg-gray-50/30">
          <span className="text-xs font-semibold text-slate-500">
            {listLoading ? "Loading..." : listMeta ? `Showing ${(listMeta.current_page - 1) * listMeta.per_page + 1}–${Math.min(listMeta.current_page * listMeta.per_page, listMeta.total)} of ${listMeta.total}` : `Showing ${transactions.length}`}
          </span>
        </div>
        <div className="overflow-x-auto">
          {listLoading ? (
            <TableSkeleton rows={8} cols={9} />
          ) : (
            <table className="w-full text-sm text-left min-w-[800px]">
              <thead className="bg-gray-50/50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Reference</th>
                  <th className="px-6 py-4">Party</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                  <th className="px-6 py-4">Payment</th>
                  <th className="px-6 py-4 text-right">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="p-12 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-400">
                        <Receipt className="h-12 w-12 mb-3 opacity-20" />
                        <p className="text-lg font-medium text-gray-500">No transactions found</p>
                        <p className="text-sm">Adjust filters or date range.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  transactions.map((txn) => (
                    <tr key={txn.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-slate-600 font-semibold">{txn.id}</td>
                      <td className="px-6 py-4">
                        <span
                          className={clsx(
                            "px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-1 w-fit",
                            txn.type === "Income" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                          )}
                        >
                          {txn.type === "Income" ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                          {txn.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium">{txn.date}</td>
                      <td className="px-6 py-4 text-slate-500 text-xs font-mono">{txn.reference || txn.transactionId || "—"}</td>
                      <td className="px-6 py-4 font-bold text-slate-800">{txn.party || "—"}</td>
                      <td className="px-6 py-4 font-bold text-slate-900 text-right font-mono">
                        ₹ {parseFloat(txn.amount || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        <span className="px-2 py-1 bg-gray-100 border border-gray-200 rounded text-xs font-semibold">{txn.method || "—"}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="inline-block px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wide">
                          {displayStatus(txn)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => openViewModal(txn)}
                          className="p-2 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                          title="View"
                        >
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
        {listMeta && listMeta.last_page > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
            <span className="text-sm text-slate-600">
              Showing {(listMeta.current_page - 1) * listMeta.per_page + 1}–{Math.min(listMeta.current_page * listMeta.per_page, listMeta.total)} of {listMeta.total}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={listMeta.current_page <= 1}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-slate-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={listMeta.current_page >= listMeta.last_page}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-slate-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View Details Modal - uses row data, no extra fetch */}
      {viewModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">Transaction Info</h3>
              <button
                type="button"
                onClick={() => {
                  setViewModalOpen(false);
                  setViewDetail(null);
                }}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-6 space-y-4">
              {viewDetail ? (
                <>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="text-slate-500">Transaction ID</div>
                    <div className="font-semibold text-slate-800">{viewDetail.id}</div>
                    <div className="text-slate-500">Amount</div>
                    <div className="font-bold text-slate-900">₹ {parseFloat(viewDetail.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                    <div className="text-slate-500">Bank/Treasury</div>
                    <div className="font-medium text-slate-800">{viewDetail.bankName || viewDetail.bank || "—"}</div>
                    <div className="text-slate-500">Related Party</div>
                    <div className="font-medium text-slate-800">{viewDetail.party || "—"}</div>
                    <div className="text-slate-500">Transaction Date</div>
                    <div className="font-medium text-slate-800">{viewDetail.date || "—"}</div>
                    <div className="text-slate-500">Type</div>
                    <div>
                      <span
                        className={clsx(
                          "px-2 py-0.5 rounded text-xs font-bold uppercase",
                          viewDetail.type === "Income" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                        )}
                      >
                        {viewDetail.type}
                      </span>
                    </div>
                    <div className="text-slate-500">Payment Method</div>
                    <div className="font-medium text-slate-800">{viewDetail.method || "—"}</div>
                    <div className="text-slate-500">Status</div>
                    <div className="font-medium text-slate-800">{displayStatus(viewDetail)}</div>
                    <div className="text-slate-500">Reference No.</div>
                    <div className="font-mono text-xs text-slate-700">{viewDetail.reference || viewDetail.transactionId || "—"}</div>
                  </div>
                  {viewDetail.description && (
                    <div>
                      <div className="text-slate-500 text-sm mb-1">Description</div>
                      <p className="text-slate-800 text-sm">{viewDetail.description}</p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-slate-500 text-center py-8">No details available.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
