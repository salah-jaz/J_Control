import React, { useState } from "react";

// =====================================
// Report Types
// =====================================
const REPORTS = [
  { key: "income", label: "Income Report" },
  { key: "expense", label: "Expense Report" },
  { key: "pl", label: "Profit & Loss" },
  { key: "bank", label: "Bank Statement" },
  { key: "ledger", label: "Customer Ledger" },
  { key: "monthly", label: "Monthly / Yearly" },
];

// =====================================
// Filters Bar (Sticky)
// =====================================
const FiltersBar = ({ filters, setFilters }) => (
  <div className="sticky top-0 z-10 bg-white/90 backdrop-blur rounded-2xl shadow p-5 mb-6">
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      <div>
        <label className="text-xs font-semibold text-gray-500">FROM</label>
        <input
          type="date"
          className="w-full mt-1 border rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500"
          value={filters.from}
          onChange={(e) => setFilters({ ...filters, from: e.target.value })}
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-gray-500">TO</label>
        <input
          type="date"
          className="w-full mt-1 border rounded-xl px-3 py-2"
          value={filters.to}
          onChange={(e) => setFilters({ ...filters, to: e.target.value })}
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-gray-500">COMPANY</label>
        <select
          className="w-full mt-1 border rounded-xl px-3 py-2"
          value={filters.company}
          onChange={(e) => setFilters({ ...filters, company: e.target.value })}
        >
          <option value="">All</option>
          <option>ABC Pvt Ltd</option>
          <option>XYZ Solutions</option>
        </select>
      </div>
      <div>
        <label className="text-xs font-semibold text-gray-500">ACCOUNT</label>
        <select
          className="w-full mt-1 border rounded-xl px-3 py-2"
          value={filters.account}
          onChange={(e) => setFilters({ ...filters, account: e.target.value })}
        >
          <option value="">All</option>
          <option>HDFC Bank</option>
          <option>Cash</option>
        </select>
      </div>
      <div>
        <label className="text-xs font-semibold text-gray-500">CATEGORY</label>
        <select
          className="w-full mt-1 border rounded-xl px-3 py-2"
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
        >
          <option value="">All</option>
          <option>Sales</option>
          <option>Purchase</option>
          <option>Salary</option>
        </select>
      </div>
    </div>
  </div>
);

// =====================================
// KPI Summary Cards
// =====================================
const SummaryCards = () => (
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
    {["Total Income", "Total Expense", "Net Profit", "Closing Balance"].map(
      (item, i) => (
        <div
          key={i}
          className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white p-5 shadow"
        >
          <p className="text-sm opacity-80">{item}</p>
          <h3 className="text-2xl font-bold mt-2">₹ 1,25,000</h3>
        </div>
      )
    )}
  </div>
);

// =====================================
// Report Tabs
// =====================================
const ReportTabs = ({ active, setActive }) => (
  <div className="flex flex-wrap gap-2 mb-6">
    {REPORTS.map((r) => (
      <button
        key={r.key}
        onClick={() => setActive(r)}
        className={`px-5 py-2 rounded-full text-sm font-medium transition
          ${
            active.key === r.key
              ? "bg-blue-600 text-white shadow"
              : "bg-gray-100 hover:bg-gray-200"
          }`}
      >
        {r.label}
      </button>
    ))}
  </div>
);

// =====================================
// Report Table
// =====================================
const ReportTable = ({ report }) => (
  <div className="bg-white rounded-2xl shadow p-6">
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-lg font-semibold">{report.label}</h2>
      <div className="flex gap-2">
        <button className="px-4 py-2 text-sm rounded-xl border hover:bg-gray-100">
          Export PDF
        </button>
        <button className="px-4 py-2 text-sm rounded-xl border hover:bg-gray-100">
          Export Excel
        </button>
      </div>
    </div>

    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-3 text-left">Date</th>
            <th className="p-3 text-left">Description</th>
            <th className="p-3 text-right">Debit</th>
            <th className="p-3 text-right">Credit</th>
            <th className="p-3 text-right">Balance</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b">
            <td className="p-3">01-04-2024</td>
            <td className="p-3">Opening Balance</td>
            <td className="p-3 text-right">-</td>
            <td className="p-3 text-right">-</td>
            <td className="p-3 text-right font-semibold">₹50,000</td>
          </tr>
          <tr className="border-b">
            <td className="p-3">10-04-2024</td>
            <td className="p-3">Invoice #INV001</td>
            <td className="p-3 text-right">-</td>
            <td className="p-3 text-right">₹25,000</td>
            <td className="p-3 text-right">₹75,000</td>
          </tr>
          <tr className="bg-gray-50">
            <td colSpan="4" className="p-3 text-right font-semibold">
              Closing Balance
            </td>
            <td className="p-3 text-right font-bold text-green-600">₹75,000</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
);

// =====================================
// Main Reports Page (Premium)
// =====================================
const Reports = () => {
  const [active, setActive] = useState(REPORTS[0]);
  const [filters, setFilters] = useState({
    from: "",
    to: "",
    company: "",
    account: "",
    category: "",
  });

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Reports & Analytics</h1>

      <FiltersBar filters={filters} setFilters={setFilters} />

      <SummaryCards />

      <ReportTabs active={active} setActive={setActive} />

      <ReportTable report={active} />
    </div>
  );
};

export default Reports;
