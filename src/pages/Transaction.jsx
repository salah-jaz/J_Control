import React, { useEffect, useState, useMemo } from "react";
import { Download, ArrowUpRight, ArrowDownLeft, Filter, X, Eye, Receipt, TrendingUp, TrendingDown, Activity } from "lucide-react";
import clsx from "clsx";
import { exportToCSV } from "../utils/csvExport";
import { useTransactionList, useTransactionSummary } from "../hooks/useApiQueries";
import { getBankAccounts } from "../services/bankAccountService";
import { TableSkeleton } from "../components/Skeleton";
import PageHeader from "../components/ui/PageHeader";
import ToolbarSearch from "../components/ui/ToolbarSearch";
import EmptyState from "../components/ui/EmptyState";
import { FilterSelect } from "../components/ui/FilterControls";
import { TableSectionHeader, TablePagination } from "../components/ui/DataTableSection";
import { ActionIconButton } from "../components/ui/TableRowActions";

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
      <PageHeader
        title="Transactions"
        subtitle="History of all financial movements."
        secondaryActions={(
          <>
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
          </>
        )}
      />

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
              Filters
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
              Clear Filters
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="label">Type</label>
              <FilterSelect value={typeFilter} onChange={setTypeFilter}>
                <option value="">All</option>
                <option value="Income">Income</option>
                <option value="Expense">Expense</option>
              </FilterSelect>
            </div>
            <div>
              <label className="label">Status</label>
              <FilterSelect value={statusFilter} onChange={setStatusFilter}>
                <option value="">All</option>
                <option value="Paid">Paid</option>
                <option value="Received">Received</option>
                <option value="Pending">Pending</option>
                <option value="Completed">Completed</option>
              </FilterSelect>
            </div>
            <div>
              <label className="label">Bank/Treasury</label>
              <FilterSelect value={bankFilter} onChange={setBankFilter}>
                <option value="">All</option>
                {bankAccounts.map((b) => (
                  <option key={b.id} value={b.id}>{b.bank_name || b.bankName} - {b.account_number || b.accountNumber}</option>
                ))}
              </FilterSelect>
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
        <div className="p-4 md:p-5 border-b border-gray-100 bg-gray-50/50 space-y-3">
          <TableSectionHeader
            title="Transaction History"
            summary={listLoading ? "Loading..." : listMeta ? `Showing ${(listMeta.current_page - 1) * listMeta.per_page + 1}–${Math.min(listMeta.current_page * listMeta.per_page, listMeta.total)} of ${listMeta.total}` : `Showing ${transactions.length}`}
          />
          <ToolbarSearch
            placeholder="Search..."
            value={searchQuery}
            onChange={setSearchQuery}
            className="max-w-sm"
          />
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
                    <td colSpan="9" className="px-6 py-2">
                      <EmptyState
                        icon={Receipt}
                        title="No transactions found"
                        description="Adjust filters or date range."
                      />
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
                        <ActionIconButton onClick={() => openViewModal(txn)} title="View" icon={Eye} tone="view" />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
        {listMeta && listMeta.last_page > 1 && (
          <TablePagination
            summary={`Showing ${(listMeta.current_page - 1) * listMeta.per_page + 1}–${Math.min(listMeta.current_page * listMeta.per_page, listMeta.total)} of ${listMeta.total}`}
            onPrevious={() => setCurrentPage((p) => Math.max(1, p - 1))}
            onNext={() => setCurrentPage((p) => p + 1)}
            previousDisabled={listMeta.current_page <= 1}
            nextDisabled={listMeta.current_page >= listMeta.last_page}
          />
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
