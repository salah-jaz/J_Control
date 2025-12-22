import React, { useEffect, useState } from "react";
import { getTransactions } from "../services/transactionService";
import { Search, Download, ArrowUpRight, ArrowDownLeft, Filter } from "lucide-react";
import clsx from "clsx";

export default function Transaction() {
  const [transactions, setTransactions] = useState([]);

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

  return (
    <div className="p-8 max-w-[1600px] mx-auto animate-fade-in space-y-8">
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Transactions</h1>
          <p className="text-slate-500 mt-1 text-lg">History of all financial movements.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary flex items-center gap-2">
            <Filter size={18} />
            Filter
          </button>
          <button className="btn-secondary flex items-center gap-2">
            <Download size={18} />
            Export
          </button>
        </div>
      </div>

      {/* TRANSACTION TABLE */}
      <div className="card p-0 overflow-hidden min-h-[500px]">
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="font-bold text-slate-800">Transaction History</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input type="text" placeholder="Search..." className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 w-64 transition-all" />
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
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-12 text-center text-slate-400 italic">
                    No transactions found
                  </td>
                </tr>
              ) : (
                transactions.map((txn, index) => (
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
