import React, { useState, useRef } from "react";
import { Download, FileText, TrendingUp, TrendingDown, DollarSign, Filter, X } from "lucide-react";
import clsx from "clsx";
import { useReactToPrint } from "react-to-print";
import { exportToCSV } from "../utils/csvExport";
import { useReportsSummary, useReportDetails, useReportFilters } from "../hooks/useApiQueries";
import { TableSkeleton } from "../components/Skeleton";

// =====================================
// Report Types
// =====================================
const REPORTS = [
  { key: "income", label: "Income Report" },
  { key: "expense", label: "Expense Report" },
  { key: "invoices", label: "Invoices Report" },
  { key: "pl", label: "Profit & Loss" },
];

// =====================================
// Filters Bar
// =====================================
const FiltersBar = ({ filters, setFilters, options }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
    <div className="flex items-center gap-2 mb-4 text-slate-800 font-bold">
      <Filter size={18} className="text-brand-600" />
      Filter Reports
    </div>
    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
      <div>
        <label className="label">Start Date</label>
        <input
          type="date"
          className="input"
          value={filters.from}
          onChange={(e) => setFilters({ ...filters, from: e.target.value })}
        />
      </div>
      <div>
        <label className="label">End Date</label>
        <input
          type="date"
          className="input"
          value={filters.to}
          onChange={(e) => setFilters({ ...filters, to: e.target.value })}
        />
      </div>
      <div>
        <label className="label">Company / Party</label>
        <select
          className="input"
          value={filters.company}
          onChange={(e) => setFilters({ ...filters, company: e.target.value })}
        >
          <option value="">All Companies</option>
          {options.companies.map((c, i) => (
            <option key={i} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Account</label>
        <select
          className="input"
          value={filters.account}
          onChange={(e) => setFilters({ ...filters, account: e.target.value })}
        >
          <option value="">All Accounts</option>
          {options.accounts.map((a, i) => (
            <option key={i} value={a}>{a}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Category</label>
        <select
          className="input"
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
        >
          <option value="">All Categories</option>
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
          className="btn-secondary w-full flex items-center justify-center gap-2"
        >
          <X size={16} /> Clear
        </button>
      </div>
    </div>
  </div>
);

// =====================================
// KPI Summary Cards
// =====================================
const SummaryCards = ({ stats }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
    {[
      { label: "Total Income", value: stats.totalIncome, color: "bg-emerald-500", icon: TrendingUp, textColor: "text-emerald-500" },
      { label: "Total Expense", value: stats.totalExpense, color: "bg-red-500", icon: TrendingDown, textColor: "text-red-500" },
      { label: "Net Profit", value: stats.netProfit, color: "bg-brand-500", icon: DollarSign, textColor: "text-brand-500" },
    ].map((item, i) => (
      <div
        key={i}
        className="card group hover:border-brand-200 transition-all duration-300 relative overflow-hidden"
      >
        <div className="relative z-10 flex justify-between items-start">
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-1">{item.label}</p>
            <h3 className="text-3xl font-bold text-slate-800 tracking-tight">
              ₹ {parseFloat(item.value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <div className={`p-3 rounded-2xl ${item.color} bg-opacity-10`}>
            <item.icon className={`w-6 h-6 ${item.textColor}`} />
          </div>
        </div>
        <div className={`absolute bottom-0 left-0 h-1 w-full ${item.color} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left`}></div>
      </div>
    ))}
  </div>
);

// =====================================
// Report Tabs
// =====================================
const ReportTabs = ({ active, setActive }) => (
  <div className="flex flex-wrap gap-2 mb-6 p-1 bg-white border border-gray-100 rounded-xl w-fit shadow-sm">
    {REPORTS.map((r) => (
      <button
        key={r.key}
        onClick={() => setActive(r)}
        className={clsx(
          "px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-200",
          active.key === r.key
            ? "bg-slate-900 text-white shadow-md shadow-slate-200"
            : "text-slate-500 hover:text-slate-900 hover:bg-gray-50"
        )}
      >
        {r.label}
      </button>
    ))}
  </div>
);

// =====================================
// Report Table
// =====================================
const ReportTable = ({ report, data, isLoading }) => {
  const componentRef = useRef();

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: `${report.label}_Report`,
  });

  const safeData = Array.isArray(data) ? data : [];

  return (
    <div className="card p-0 overflow-hidden" ref={componentRef}>
      <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <div className="flex items-center gap-2">
          <FileText size={20} className="text-slate-400" />
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">{report.label} Details</h2>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 print:hidden">
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:text-brand-600 transition-colors shadow-sm"
          >
            <Download size={16} />
            <span className="sm:hidden lg:inline">Export PDF</span>
            <span className="hidden sm:inline lg:hidden">PDF</span>
          </button>
          <button
            onClick={() => exportToCSV(safeData, `${report.label.replace(/\s+/g, '_')}_Report`)}
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:text-brand-600 transition-colors shadow-sm"
          >
            <Download size={16} />
            <span className="sm:hidden lg:inline">Export Excel</span>
            <span className="hidden sm:inline lg:hidden">Excel</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto custom-scrollbar">
        {isLoading ? (
          <TableSkeleton rows={8} cols={4} />
        ) : (
          <table className="min-w-[800px] w-full text-sm">
            <thead className="bg-gray-50/50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left">Date</th>
                <th className="px-6 py-4 text-left">Description</th>
                <th className="px-6 py-4 text-right">Debit</th>
                <th className="px-6 py-4 text-right">Credit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {safeData.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-slate-500 italic">
                    No records found for the selected period.
                  </td>
                </tr>
              ) : (
                safeData.map((row, index) => (
                  <tr key={row.id || index} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-slate-600">{row.date}</td>
                    <td className="px-6 py-4 text-slate-800 font-medium">{row.description}</td>
                    <td className="px-6 py-4 text-right font-mono font-medium text-red-600">
                      {row.debit !== '-' ? `₹${parseFloat(row.debit).toLocaleString()}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-medium text-emerald-600">
                      {row.credit !== '-' ? `₹${parseFloat(row.credit).toLocaleString()}` : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// =====================================
// Main Reports Page
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

  const { data: stats = {} } = useReportsSummary(filters);
  const { data: reportData, isLoading: detailsLoading } = useReportDetails(active.key, filters);
  const { data: filterOptions = { companies: [], accounts: [], categories: [] } } = useReportFilters();

  const options = {
    companies: Array.isArray(filterOptions.companies) ? filterOptions.companies : [],
    accounts: Array.isArray(filterOptions.accounts) ? filterOptions.accounts : [],
    categories: Array.isArray(filterOptions.categories) ? filterOptions.categories : [],
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto animate-fade-in space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Financial Reports</h1>
        <p className="text-slate-500 mt-1 text-base md:text-lg">Gain insights into your business performance.</p>
      </div>

      <FiltersBar filters={filters} setFilters={setFilters} options={options} />

      <SummaryCards stats={stats} />

      <div className="space-y-4">
        <ReportTabs active={active} setActive={setActive} />
        <ReportTable report={active} data={reportData} isLoading={detailsLoading} />
      </div>
    </div>
  );
};

export default Reports;
