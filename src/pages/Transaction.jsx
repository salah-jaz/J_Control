import React, { useEffect, useState } from "react";
import { getTransactions } from "../services/transactionService";

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
    <div className="p-6">

      {/* PAGE TITLE */}
      <h1 className="text-xl font-semibold mb-4">Transactions</h1>

      {/* TRANSACTION TABLE */}
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50/50 text-xs text-gray-500 uppercase border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Txn ID</th>
              <th className="px-4 py-3 text-left font-semibold">Type</th>
              <th className="px-4 py-3 text-left font-semibold">Date</th>
              <th className="px-4 py-3 text-left font-semibold">Reference</th>
              <th className="px-4 py-3 text-left font-semibold">Party</th>
              <th className="px-4 py-3 text-left font-semibold">Amount</th>
              <th className="px-4 py-3 text-left font-semibold">Payment</th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
            </tr>
          </thead>

          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan="8" className="p-8 text-center text-gray-500">
                  No transactions found
                </td>
              </tr>
            ) : (
              transactions.map((txn, index) => (
                <tr
                  key={index}
                  className="border-t hover:bg-gray-50"
                >
                  <td className="px-4 py-3 font-medium">
                    {txn.transactionId}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${txn.type === 'Income' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                      }`}>
                      {txn.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{txn.date}</td>
                  <td className="px-4 py-3 text-gray-500">{txn.reference || '-'}</td>
                  <td className="px-4 py-3 font-medium text-gray-700">{txn.party || '-'}</td>
                  <td className="px-4 py-3 font-bold text-gray-900">
                    ₹ {txn.amount}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{txn.method}</td>
                  <td className="px-4 py-3">
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">
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
  );
}
