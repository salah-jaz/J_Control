import React, { useEffect, useState, useMemo } from "react";
import { Download, ArrowUpRight, ArrowDownLeft, Filter, X, Eye, Receipt, TrendingUp, TrendingDown, Activity, Search, Landmark, Banknote } from "lucide-react";
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

  const getBankNameDisplay = (txn) => {
    if (!txn) return "—";

    const isCash = String(txn.method).toLowerCase() === 'cash' ||
      txn.bankAccount?.bank_name?.toLowerCase() === 'cash' ||
      txn.bankAccount?.account_type?.toLowerCase() === 'cash' ||
      txn.bankAccount?.account_name?.toLowerCase()?.includes('cash') ||
      String(txn.bank).toLowerCase() === 'cash' ||
      String(txn.bankName).toLowerCase() === 'cash';

    const targetId = txn.bankAccountId || txn.bank_account_id || txn.bankAccount?.id;
    if (targetId) {
      const b = bankAccounts.find((acc) => String(acc.id) === String(targetId));
      if (b) {
        const isAccCash = b.accountType?.toLowerCase() === 'cash' ||
          b.bankName?.toLowerCase() === 'cash' ||
          b.accountNumber?.toLowerCase() === 'cash' ||
          b.accountName?.toLowerCase()?.includes('cash');
        if (isAccCash) return b.accountName || "Cash Account";
        return b.bankName || b.accountName || b.nickName || "Bank Account";
      }
    }

    if (txn.bankAccount) {
      const isRelCash = txn.bankAccount.bank_name?.toLowerCase() === 'cash' ||
        txn.bankAccount.account_type?.toLowerCase() === 'cash' ||
        txn.bankAccount.account_name?.toLowerCase()?.includes('cash');
      if (isRelCash) {
        return txn.bankAccount.account_name || "Cash Account";
      }
      return txn.bankAccount.bank_name || txn.bankAccount.bankName || txn.bankAccount.account_name || "Bank Account";
    }

    if (txn.bankName) {
      if (txn.bankName.toLowerCase() === 'cash') return "Cash Account";
      return txn.bankName;
    }

    if (txn.bank) {
      if (txn.bank.toLowerCase() === 'cash') return "Cash Account";
      return txn.bank;
    }

    if (isCash) return "Cash Account";
    return "—";
  };

  const getTransactionDescription = (txn) => {
    if (!txn) return "—";
    const isOB = txn.category === 'Opening Balance' ||
      (txn.reference && String(txn.reference).startsWith('BANK-OB-')) ||
      (txn.transactionId && String(txn.transactionId).startsWith('BANK-OB-'));
    if (isOB) {
      return "Opening Balance";
    }
    const defaultParty = txn.party ? (txn.type === 'Expense' ? `Expense payment for ${txn.party}` : `Income payment from ${txn.party}`) : "Transaction record";
    return txn.description || txn.reference || defaultParty;
  };

  const displayStatus = (txn) => txn?.incomeStatus || txn?.status || "—";

  return (
    <div className="flex flex-col h-full bg-slate-50/50 animate-in fade-in duration-500 overflow-hidden">
      <div className="px-6 lg:px-8 pt-8 pb-6 bg-white border-b border-slate-200/60 shadow-sm relative z-10">
        <PageHeader
          title="Financial Ledger"
          subtitle="Comprehensive history of all organizational financial movements and capital flows."
          secondaryActions={(
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={clsx(
                  "p-2.5 rounded-xl border transition-all shadow-sm flex items-center gap-2 text-[13px] font-bold active:scale-95",
                  showFilters 
                    ? "bg-indigo-50 border-indigo-200 text-indigo-600 ring-4 ring-indigo-500/10" 
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
              >
                <Filter size={18} />
                <span>Intelligence Filters</span>
              </button>
              <button
                onClick={() => {
                  const exportData = transactions.map((t) => ({
                    ID: t.id,
                    Type: t.type,
                    Party: t.party || '—',
                    Date: t.date,
                    Amount: t.amount,
                    Bank: getBankNameDisplay(t),
                    Status: displayStatus(t),
                    Reference: t.reference || t.transactionId || '—',
                    Description: getTransactionDescription(t),
                  }));
                  exportToCSV(exportData, "transactions_export");
                }}
                className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 shadow-sm transition-all active:scale-95 flex items-center gap-2 text-[13px] font-bold"
              >
                <Download size={18} />
                <span>Export Ledger</span>
              </button>
            </div>
          )}
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8">
          <StatCard
            title="Total Journal Entries"
            value={summary?.totalTransactions ?? "—"}
            icon={Receipt}
            color="bg-slate-800"
          />
          <StatCard
            title="Aggregate Inflow"
            value={summary?.totalIncome != null ? `₹${Number(summary.totalIncome).toLocaleString("en-IN", { minimumFractionDigits: 0 })}` : "—"}
            icon={TrendingUp}
            color="bg-emerald-600"
          />
          <StatCard
            title="Aggregate Outflow"
            value={summary?.totalExpense != null ? `₹${Number(summary.totalExpense).toLocaleString("en-IN", { minimumFractionDigits: 0 })}` : "—"}
            icon={TrendingDown}
            color="bg-rose-600"
          />
          <StatCard
            title="Cycle Velocity (7d)"
            value={summary?.recentCount ?? "—"}
            icon={Activity}
            color="bg-indigo-600"
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 bg-white">
        <div className="bg-slate-50/50 px-6 lg:px-8 py-3 border-b border-slate-100 flex flex-wrap items-center gap-3 sticky top-0 z-20">
          <div className="flex-1 min-w-[240px]">
            <div className="relative group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
              <input
                type="text"
                placeholder="Search by ID, party, or reference..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
             {/* Simple filter indicators if any active */}
             {(typeFilter || statusFilter || bankFilter || dateFrom || dateTo) && (
               <button 
                 onClick={() => { setTypeFilter(""); setStatusFilter(""); setBankFilter(""); setDateFrom(""); setDateTo(""); }}
                 className="px-3 py-2 text-[11px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 rounded-xl border border-rose-100 hover:bg-rose-100 transition-colors"
               >
                 Reset Parameters
               </button>
             )}
          </div>
        </div>

        {showFilters && (
          <div className="bg-white px-6 lg:px-8 py-6 border-b border-slate-100 grid grid-cols-1 md:grid-cols-5 gap-6 animate-in slide-in-from-top-2">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block">Strategy Type</label>
              <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[13px] font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                <option value="">All Transactions</option>
                <option value="Income">Inflow (Income)</option>
                <option value="Expense">Outflow (Expense)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block">Settlement Status</label>
              <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[13px] font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="">All Execution States</option>
                <option value="Paid">Settled (Paid)</option>
                <option value="Received">Realized (Received)</option>
                <option value="Pending">In Transit (Pending)</option>
                <option value="Completed">Finalized (Completed)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block">Treasury Channel</label>
              <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[13px] font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all" value={bankFilter} onChange={e => setBankFilter(e.target.value)}>
                <option value="">All Corporate Accounts</option>
                {bankAccounts.map((b) => (
                  <option key={b.id} value={b.id}>{b.bank_name || b.bankName} - {b.account_number || b.accountNumber}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block">Window Start</label>
              <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[13px] font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block">Window End</label>
              <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[13px] font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto custom-scrollbar">
          <div className="min-w-full">
            <table className="w-full text-left border-collapse table-fixed">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 sticky top-0 z-10">
                  <th className="px-6 lg:px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-32">Entry Ref</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-36">Nature</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Party / Counterpart</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-32">Execution</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right w-44">Quantum</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-40">Bank</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right w-36">Status</th>
                  <th className="px-6 lg:px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right w-24">Ops</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {listLoading ? (
                  <tr><td colSpan="8" className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest animate-pulse italic">Synchronizing Financial Ledger...</td></tr>
                ) : transactions.map((txn) => (
                  <tr key={txn.id} className="group hover:bg-slate-50/80 transition-all duration-200">
                    <td className="px-6 lg:px-8 py-5">
                      <span className="font-mono text-[11px] font-black text-slate-400 italic tracking-tighter">#TXN-{txn.id}</span>
                    </td>
                    <td className="px-6 py-5">
                      <div className={clsx(
                        "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border shadow-sm w-fit",
                        txn.type === "Income" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-rose-50 text-rose-700 border-rose-100"
                      )}>
                        {txn.type === "Income" ? <ArrowDownLeft size={12} strokeWidth={3} /> : <ArrowUpRight size={12} strokeWidth={3} />}
                        {txn.type}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-[13px] font-black text-slate-900 truncate">{txn.party || 'Internal Allocation'}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5 truncate max-w-[200px]">{txn.reference || txn.transactionId || '—'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-[12px] font-black text-slate-600 italic">{txn.date}</span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex flex-col items-end">
                        <span className={clsx(
                          "font-mono text-[16px] font-black italic tracking-tight",
                          txn.type === "Income" ? "text-emerald-600" : "text-rose-600"
                        )}>
                          ₹ {parseFloat(txn.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                        {txn.currentBalance != null && (
                          <span className="text-[10px] font-bold text-slate-400 font-mono tracking-tighter mt-0.5">
                            Bal: ₹ {Number(txn.currentBalance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      {(() => {
                        const bankDisplay = getBankNameDisplay(txn);
                        const isCashDisplay = bankDisplay.toLowerCase().includes('cash');
                        return (
                          <div className="flex items-center gap-2 text-slate-700 min-w-0">
                            {isCashDisplay ? (
                              <Banknote size={14} className="text-emerald-600 shrink-0" />
                            ) : (
                              <Landmark size={14} className="text-indigo-600 shrink-0" />
                            )}
                            <span className="text-[12px] font-bold text-slate-800 tracking-tight truncate" title={bankDisplay}>
                              {bankDisplay}
                            </span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <span className="px-3 py-1.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-slate-900/10">
                        {displayStatus(txn)}
                      </span>
                    </td>
                    <td className="px-6 lg:px-8 py-5 text-right">
                       <ActionIconButton onClick={() => openViewModal(txn)} title="Intelligence View" icon={Eye} tone="view" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!listLoading && transactions.length === 0 && (
              <div className="p-20">
                <EmptyState icon={Receipt} title="No Transactions Indexed" description="The financial ledger is currently void for this parameter set." />
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border-t border-slate-100 px-6 lg:px-8 py-4 flex-shrink-0">
          {listMeta && <TablePagination summary={`Indexed ${transactions.length} of ${listMeta.total} Capital Events`} onPrevious={() => setCurrentPage(p => Math.max(1, p - 1))} onNext={() => setCurrentPage(p => p + 1)} previousDisabled={listMeta.current_page <= 1} nextDisabled={listMeta.current_page >= listMeta.last_page} />}
        </div>
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
            <div className="overflow-y-auto p-6 space-y-5">
              {viewDetail ? (
                <>
                  {/* Account Ledger Running Balance Card */}
                  <div className="p-4 bg-gradient-to-br from-slate-50 to-indigo-50/40 rounded-2xl border border-indigo-100/70 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                        <Landmark size={13} />
                        Account Ledger Movement
                      </span>
                      <span className="text-[11px] font-bold text-slate-600 truncate max-w-[200px]" title={getBankNameDisplay(viewDetail)}>
                        {getBankNameDisplay(viewDetail)}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2.5 pt-1">
                      <div className="bg-white p-3 rounded-xl border border-slate-200/70 shadow-sm">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Previous Balance</span>
                        <span className="text-[14px] font-black text-slate-700 font-mono italic mt-0.5 block">
                          {viewDetail.previousBalance != null
                            ? `₹ ${Number(viewDetail.previousBalance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                            : "—"}
                        </span>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-slate-200/70 shadow-sm">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Amount</span>
                        <span className={clsx(
                          "text-[14px] font-black font-mono italic mt-0.5 block",
                          viewDetail.type === "Income" ? "text-emerald-600" : "text-rose-600"
                        )}>
                          {viewDetail.type === "Income" ? "+" : "-"} ₹ {Number(viewDetail.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-sm">
                        <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest block">Current Balance</span>
                        <span className="text-[14px] font-black text-indigo-700 font-mono italic mt-0.5 block">
                          {viewDetail.currentBalance != null
                            ? `₹ ${Number(viewDetail.currentBalance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                            : "—"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="text-slate-500">Transaction ID</div>
                    <div className="font-semibold text-slate-800">{viewDetail.id}</div>
                    <div className="text-slate-500">Transaction Amount</div>
                    <div className="font-bold text-slate-900">₹ {parseFloat(viewDetail.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                    <div className="text-slate-500">Bank / Channel</div>
                    <div className="font-medium text-slate-800">{getBankNameDisplay(viewDetail)}</div>
                    <div className="text-slate-500">Related Party</div>
                    <div className="font-medium text-slate-800">{viewDetail.party || "—"}</div>
                    <div className="text-slate-500">Transaction Date</div>
                    <div className="font-medium text-slate-800">{viewDetail.date || "—"}</div>
                    <div className="text-slate-500">Nature / Type</div>
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

                  <div className="space-y-3">
                    <div>
                      <div className="text-slate-500 text-sm mb-1 font-medium">Source Description</div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 text-slate-800 text-sm leading-relaxed font-semibold">
                        {getTransactionDescription(viewDetail)}
                      </div>
                    </div>

                    {viewDetail.userDescription && viewDetail.userDescription !== getTransactionDescription(viewDetail) && (
                      <div>
                        <div className="text-slate-500 text-sm mb-1 font-medium">Original Remarks / Notes</div>
                        <div className="p-3 bg-white rounded-xl border border-slate-200 text-slate-600 text-sm leading-relaxed font-medium">
                          {viewDetail.userDescription}
                        </div>
                      </div>
                    )}
                  </div>
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
