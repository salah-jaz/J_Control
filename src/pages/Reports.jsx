import React, { useState, useEffect } from "react";
import { getReportsSummary, getReportDetails, getReportFilters } from "../services/db";

// =====================================
// Report Types
// =====================================
const REPORTS = [
  { key: "income", label: "Income Report" },
  { key: "expense", label: "Expense Report" },
  { key: "invoices", label: "Invoices Report" },
  { key: "pl", label: "Profit & Loss" }, // Basic combined view
  // { key: "bank", label: "Bank Statement" }, // Not fully implemented yet
  // { key: "ledger", label: "Customer Ledger" }, // Not fully implemented yet
  // { key: "monthly", label: "Monthly / Yearly" }, // Not fully implemented yet
];

// =====================================
// Filters Bar (Sticky)
// =====================================
const FiltersBar = ({ filters, setFilters, options }) => (
  <div className="sticky top-0 z-10 bg-white/90 backdrop-blur rounded-2xl shadow p-5 mb-6">
    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
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
        <label className="text-xs font-semibold text-gray-500">COMPANY / PARTY</label>
        <select
          className="w-full mt-1 border rounded-xl px-3 py-2"
          value={filters.company}
          onChange={(e) => setFilters({ ...filters, company: e.target.value })}
        >
          <option value="">All</option>
          {options.companies.map((c, i) => (
            <option key={i} value={c}>{c}</option>
          ))}
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
          {options.accounts.map((a, i) => (
            <option key={i} value={a}>{a}</option>
          ))}
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
          {options.categories.map((c, i) => (
            <option key={i} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="flex items-end">
        <button
          onClick={() => setFilters({
            from: "",
            to: "",
            company: "",
            account: "",
            category: ""
          })}
          className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-xl transition-colors"
        >
          Clear Filters
        </button>
      </div>
    </div>
  </div>
);

// =====================================
// KPI Summary Cards
// =====================================
const SummaryCards = ({ stats }) => (
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
    {[
      { label: "Total Income", value: stats.totalIncome, color: "from-green-500 to-emerald-600" },
      { label: "Total Expense", value: stats.totalExpense, color: "from-red-500 to-rose-600" },
      { label: "Net Profit", value: stats.netProfit, color: "from-blue-600 to-indigo-600" },
      // { label: "Closing Balance", value: stats.closingBalance, color: "from-gray-600 to-gray-800" } // Hidden until implemented
    ].map((item, i) => (
      <div
        key={i}
        className={`rounded-2xl bg-gradient-to-br ${item.color} text-white p-5 shadow`}
      >
        <p className="text-sm opacity-80">{item.label}</p>
        <h3 className="text-2xl font-bold mt-2">
          ₹ {parseFloat(item.value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </h3>
      </div>
    ))}
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
          ${active.key === r.key
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
const ReportTable = ({ report, data }) => (
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
            {/* <th className="p-3 text-right">Balance</th> // Balance logic needs work */}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan="5" className="p-5 text-center text-gray-500">No records found for the selected period.</td>
            </tr>
          ) : (
            data.map((row, index) => (
              <tr key={index} className="border-b hover:bg-gray-50">
                <td className="p-3">{row.date}</td>
                <td className="p-3">{row.description}</td>
                <td className="p-3 text-right font-mono text-red-600">
                  {row.debit !== '-' ? `₹${parseFloat(row.debit).toLocaleString()}` : '-'}
                </td>
                <td className="p-3 text-right font-mono text-green-600">
                  {row.credit !== '-' ? `₹${parseFloat(row.credit).toLocaleString()}` : '-'}
                </td>
                {/* <td className="p-3 text-right font-semibold">₹0</td> */}
              </tr>
            ))
          )}
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

  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpense: 0,
    netProfit: 0,
    closingBalance: 0
  });

  const [reportData, setReportData] = useState([]);
  const [filterOptions, setFilterOptions] = useState({
    companies: [],
    accounts: [],
    categories: []
  });

  // Load Filter Options on Mount
  useEffect(() => {
    getReportFilters().then(setFilterOptions);
  }, []);

  // Load Data when Filters or Active Tab changes
  useEffect(() => {
    const loadData = async () => {
      // Fetch Summary
      const s = await getReportsSummary(filters);
      setStats(s);

      // Fetch Details
      const d = await getReportDetails(active.key, filters);
      setReportData(d);
    };
    loadData();
  }, [filters, active]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Reports & Analytics</h1>

      <FiltersBar filters={filters} setFilters={setFilters} options={filterOptions} />

      <SummaryCards stats={stats} />

      <ReportTabs active={active} setActive={setActive} />

      <ReportTable report={active} data={reportData} />
    </div>
  );
};

export default Reports;
