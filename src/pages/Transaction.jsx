import React, { useEffect, useState } from "react";
import { getTransactions } from "../services/transactionService";
import { Search, Download, ArrowUpRight, ArrowDownLeft, Filter, X } from "lucide-react";
import clsx from "clsx";
import { exportToCSV } from "../utils/csvExport";

export default function Transaction() {
  const [transactions, setTransactions] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    type: "",
    status: "",
    startDate: "",
    endDate: ""
  });
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const data = await getTransactions();
      setTransactions(data);
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
    }
  };

  const getFilteredTransactions = () => {
    return transactions.filter(txn => {
      // 1. Search Term
      const searchMatch = !searchTerm ||
        (txn.party && txn.party.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (txn.reference && txn.reference.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (txn.transactionId && txn.transactionId.toLowerCase().includes(searchTerm.toLowerCase()));

      // 2. Type Filter
      const typeMatch = !filters.type || txn.type === filters.type;

      // 3. Status Filter
      const statusMatch = !filters.status || txn.status === filters.status;

      // 4. Date Range
      let dateMatch = true;
      if (filters.startDate) {
        dateMatch = dateMatch && new Date(txn.date) >= new Date(filters.startDate);
      }
      if (filters.endDate) {
        dateMatch = dateMatch && new Date(txn.date) <= new Date(filters.endDate);
      }

      return searchMatch && typeMatch && statusMatch && dateMatch;
    });
  };

  const filteredTransactions = getFilteredTransactions();

  return (
    <div className="p-8 max-w-[1600px] mx-auto animate-fade-in space-y-8">
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Transactions</h1>
          <p className="text-slate-500 mt-1 text-lg">History of all financial movements.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={clsx(
              "btn-secondary flex items-center gap-2",
              showFilters && "bg-slate-100 ring-2 ring-slate-200"
            )}
          >
            <Filter size={18} />
            Filter
          </button>
          <button
            onClick={() => exportToCSV(filteredTransactions, "transactions_export")}
            className="btn-secondary flex items-center gap-2"
          >
            <Download size={18} />
            Export
          </button>
        </div>
      </div>

      {/* FILTER PANEL */}
      {showFilters && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-slide-up">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Filter size={16} className="text-brand-600" />
              Filter Transactions
            </h3>
            <button onClick={() => setFilters({ type: "", status: "", startDate: "", endDate: "" })} className="text-sm text-brand-600 font-bold hover:underline">
              Reset Filters
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="label">Type</label>
              <select
                className="input"
                value={filters.type}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
              >
                <option value="">All</option>
                <option value="Income">Income</option>
                <option value="Expense">Expense</option>
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select
                className="input"
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              >
                <option value="">All</option>
                <option value="Paid">Paid</option>
                <option value="Received">Received</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
            <div>
              <label className="label">Start Date</label>
              <input
                type="date"
                className="input"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">End Date</label>
              <input
                type="date"
                className="input"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
          </div>
        </div>
      )}

      {/* TRANSACTION TABLE */}
      <div className="card p-0 overflow-hidden min-h-[500px]">
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="font-bold text-slate-800">Transaction History</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 w-64 transition-all"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50/50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Txn ID</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Reference</th>
                <th className="px-6 py-4">Party</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4">Payment</th>
                <th className="px-6 py-4 text-right">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-50">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-12 text-center text-slate-400 italic">
                    No transactions found
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((txn, index) => (
                  <tr
                    key={index}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">
                      {txn.transactionId || `#${index + 1}`}
                    </td>
                    <td className="px-6 py-4">
                      <span className={clsx(
                        "px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-1 w-fit",
                        txn.type === 'Income' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                      )}>
                        {txn.type === 'Income' ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                        {txn.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">{txn.date}</td>
                    <td className="px-6 py-4 text-slate-500 text-xs font-mono">{txn.reference || '-'}</td>
                    <td className="px-6 py-4 font-bold text-slate-800">{txn.party || '-'}</td>
                    <td className="px-6 py-4 font-bold text-slate-900 text-right font-mono">
                      ₹ {parseFloat(txn.amount || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <span className="px-2 py-1 bg-gray-100 border border-gray-200 rounded text-xs font-semibold">{txn.method}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="inline-block px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wide">
                        {txn.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
