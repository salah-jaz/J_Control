import React from "react";

export default function Transaction() {

  // 🔹 2 DUPLICATE TRANSACTIONS (AUTO LOAD)
  const transactions = [
    {
      transactionId: "TXN-1001",
      type: "Income",
      date: "2025-01-10",
      reference: "INV-001",
      party: "ABC Customer",
      amount: "10,000",
      paymentMode: "Bank",
      status: "Posted",
    },
    {
      transactionId: "TXN-1001",
      type: "Income",
      date: "2025-01-10",
      reference: "INV-001",
      party: "ABC Customer",
      amount: "10,000",
      paymentMode: "Bank",
      status: "Posted",
    },
  ];

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
            {transactions.map((txn, index) => (
              <tr
                key={index}
                className="border-t hover:bg-gray-50"
              >
                <td className="px-4 py-3 font-medium">
                  {txn.transactionId}
                </td>
                <td className="px-4 py-3">{txn.type}</td>
                <td className="px-4 py-3">{txn.date}</td>
                <td className="px-4 py-3">{txn.reference}</td>
                <td className="px-4 py-3">{txn.party}</td>
                <td className="px-4 py-3 font-semibold">
                  ₹ {txn.amount}
                </td>
                <td className="px-4 py-3">{txn.paymentMode}</td>
                <td className="px-4 py-3">
                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">
                    {txn.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
