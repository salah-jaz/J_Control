import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpRight, ArrowDownRight, ArrowRight, Wallet,
  TrendingUp, Clock, Plus, Receipt, CheckCircle2, CreditCard,
  BarChart3, PieChart as PieChartIcon, Activity, Download, FileText, FileSpreadsheet, Loader2, ChevronDown
} from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import toast from 'react-hot-toast';
import { useDashboardData } from '../hooks/useApiQueries';
import clsx from 'clsx';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { StatCardsSkeleton } from '../components/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import {
  buildDashboardReportTitle,
  exportDashboardCsv,
  formatDashboardINR,
  formatDashboardRange,
  getPeriodLabel,
} from '../utils/dashboardExport';

const PERIODS = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
];

const formatINR = formatDashboardINR;

const formatRangeLabel = formatDashboardRange;

const DASHBOARD_PRINT_STYLES = `
  @page { size: A4; margin: 14mm; }
  @media print {
    body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .dashboard-print-root { color: #0f172a; font-family: ui-sans-serif, system-ui, sans-serif; }
  }
`;

const StatCard = ({ title, value, icon: Icon, colorClass, subLabel, subValue, tone }) => (
  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-all group relative overflow-hidden">
    <div className="flex items-start justify-between relative z-10">
      <div className="flex flex-col gap-1 min-w-0">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em]">{title}</span>
        <h3 className={clsx(
          "text-[24px] md:text-[26px] font-black tracking-tight leading-none mt-1 truncate",
          tone === 'positive' && 'text-emerald-700',
          tone === 'negative' && 'text-rose-700',
          !tone && 'text-slate-900'
        )}>
          {value}
        </h3>
      </div>
      <div className={clsx("p-2.5 rounded-xl text-white shadow-lg shrink-0", colorClass)}>
        <Icon size={20} strokeWidth={2.5} />
      </div>
    </div>

    {(subLabel || subValue) && (
      <div className="mt-5 relative z-10">
        {subLabel && (
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none block mb-1">
            {subLabel}
          </span>
        )}
        {subValue != null && (
          <span className="text-[13px] font-black text-slate-700 tracking-tight">{subValue}</span>
        )}
      </div>
    )}

    <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
      <Icon size={120} />
    </div>
  </div>
);

const COLORS = ['#10b981', '#f59e0b', '#4f46e5', '#ef4444'];

const Dashboard = () => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState('month');
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exporting, setExporting] = useState(null); // 'pdf' | 'csv' | null
  const exportMenuRef = useRef(null);
  const printRef = useRef(null);
  const { stats = {}, todayIncome = [], isLoading, isFetching, refetch } = useDashboardData(period);

  const trendData = useMemo(() => {
    const series = Array.isArray(stats.trend) && stats.trend.length > 0
      ? stats.trend
      : (stats.monthlyRevenue || []);
    return series.map((row) => ({
      name: row.label || row.month || '',
      income: Number(row.income ?? row.revenue ?? 0),
      expense: Number(row.expense ?? 0),
    }));
  }, [stats.trend, stats.monthlyRevenue]);

  const cashPieData = useMemo(() => {
    const income = Number(stats.totalIncome || 0);
    const expense = Number(stats.totalExpenses || 0);
    if (income <= 0 && expense <= 0) return [];
    return [
      { name: 'Income Received', value: income },
      { name: 'Expenses Paid', value: expense },
    ].filter((d) => d.value > 0);
  }, [stats.totalIncome, stats.totalExpenses]);

  const netCashFlow = Number(stats.netCashFlow ?? 0);
  const cashTotal = Number(stats.totalIncome || 0) + Number(stats.totalExpenses || 0);
  const reportTitle = buildDashboardReportTitle(period);
  const periodLabel = getPeriodLabel(period);
  const rangeLabel = formatRangeLabel(stats.dateFrom, stats.dateTo);

  useEffect(() => {
    if (!exportMenuOpen) return undefined;
    const onPointerDown = (event) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [exportMenuOpen]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: reportTitle,
    pageStyle: DASHBOARD_PRINT_STYLES,
    onAfterPrint: () => {
      setExporting(null);
      toast.success('PDF export completed.');
    },
    onPrintError: () => {
      setExporting(null);
      toast.error('Failed to export PDF. Please try again.');
    },
  });

  const refreshDashboardForExport = async () => {
    const result = await refetch();
    if (result?.error) {
      throw result.error;
    }
    return result?.data ?? stats;
  };

  const handleExportCsv = async () => {
    setExportMenuOpen(false);
    setExporting('csv');
    try {
      const fresh = await refreshDashboardForExport();
      const series = Array.isArray(fresh?.trend) && fresh.trend.length > 0
        ? fresh.trend
        : (fresh?.monthlyRevenue || trendData);
      const nextTrend = series.map((row) => ({
        name: row.label || row.month || row.name || '',
        income: Number(row.income ?? row.revenue ?? 0),
        expense: Number(row.expense ?? 0),
      }));
      const income = Number(fresh?.totalIncome ?? stats.totalIncome ?? 0);
      const expense = Number(fresh?.totalExpenses ?? stats.totalExpenses ?? 0);
      const nextCash = (income <= 0 && expense <= 0)
        ? []
        : [
            { name: 'Income Received', value: income },
            { name: 'Expenses Paid', value: expense },
          ].filter((d) => d.value > 0);

      exportDashboardCsv({
        period,
        stats: fresh ?? stats,
        trendData: nextTrend,
        cashPieData: nextCash,
        recentIncome: fresh?.recentIncomes ?? todayIncome,
      });
      toast.success('Excel/CSV download started.');
    } catch (error) {
      console.error('Dashboard CSV export failed:', error);
      toast.error('Failed to export Excel/CSV. Please try again.');
    } finally {
      setExporting(null);
    }
  };

  const handleExportPdf = async () => {
    setExportMenuOpen(false);
    setExporting('pdf');
    try {
      await refreshDashboardForExport();
      // Allow React to paint refreshed print content before opening the dialog
      await new Promise((resolve) => setTimeout(resolve, 120));
      handlePrint();
    } catch (error) {
      console.error('Dashboard PDF export failed:', error);
      setExporting(null);
      toast.error('Failed to export PDF. Please try again.');
    }
  };

  if (isLoading && !stats.dateFrom) {
    return (
      <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
        <StatCardsSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 h-[360px] animate-pulse" />
          <div className="bg-white rounded-2xl border border-slate-200 h-[360px] animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
      {/* Off-screen printable report (cloned by react-to-print) */}
      <div className="fixed -left-[10000px] top-0 w-[210mm] pointer-events-none" aria-hidden="true">
        <div ref={printRef} className="dashboard-print-root bg-white text-slate-900 p-8">
          <div className="border-b-2 border-slate-900 pb-4 mb-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-700 mb-1">J-Control ERP</p>
            <h1 className="text-2xl font-black tracking-tight">{reportTitle}</h1>
            <p className="text-sm text-slate-600 mt-2">
              Period: <strong>{periodLabel}</strong>
              {rangeLabel ? <> · Date range: <strong>{rangeLabel}</strong></> : null}
            </p>
            <p className="text-xs text-slate-500 mt-1">Generated: {new Date().toLocaleString('en-IN')}</p>
          </div>

          <h2 className="text-sm font-black uppercase tracking-wider text-slate-500 mb-3">Financial Summary</h2>
          <table className="w-full text-sm border-collapse mb-6">
            <tbody>
              {[
                ['Total Income', formatINR(stats.totalIncome), `${stats.incomeCount ?? 0} record(s)`],
                ['Total Expenses', formatINR(stats.totalExpenses), `${stats.expenseCount ?? 0} record(s)`],
                ['Net Cash Flow', formatINR(netCashFlow), netCashFlow >= 0 ? 'Positive' : 'Negative'],
                ['Outstanding Income', formatINR(stats.outstandingIncome), `Obligation ${formatINR(stats.incomeObligation)}`],
                ['Outstanding Expenses', formatINR(stats.outstandingExpenses), `Obligation ${formatINR(stats.expenseObligation)}`],
              ].map(([label, value, note]) => (
                <tr key={label} className="border-b border-slate-200">
                  <td className="py-2.5 pr-3 font-semibold text-slate-700">{label}</td>
                  <td className="py-2.5 pr-3 text-right font-black">{value}</td>
                  <td className="py-2.5 text-right text-slate-500 text-xs">{note}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2 className="text-sm font-black uppercase tracking-wider text-slate-500 mb-3">Income & Expense Trend</h2>
          <table className="w-full text-sm border border-slate-200 border-collapse mb-6">
            <thead>
              <tr className="bg-slate-100 text-left text-[11px] uppercase tracking-wider text-slate-600">
                <th className="p-2 border border-slate-200">Period</th>
                <th className="p-2 border border-slate-200 text-right">Income</th>
                <th className="p-2 border border-slate-200 text-right">Expense</th>
                <th className="p-2 border border-slate-200 text-right">Net</th>
              </tr>
            </thead>
            <tbody>
              {trendData.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-3 text-center text-slate-500">No trend data for this period.</td>
                </tr>
              ) : trendData.map((row) => (
                <tr key={row.name}>
                  <td className="p-2 border border-slate-200 font-semibold">{row.name}</td>
                  <td className="p-2 border border-slate-200 text-right">{formatINR(row.income)}</td>
                  <td className="p-2 border border-slate-200 text-right">{formatINR(row.expense)}</td>
                  <td className="p-2 border border-slate-200 text-right font-bold">{formatINR(row.income - row.expense)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2 className="text-sm font-black uppercase tracking-wider text-slate-500 mb-3">Cash Mix</h2>
          <table className="w-full text-sm border border-slate-200 border-collapse mb-6">
            <thead>
              <tr className="bg-slate-100 text-left text-[11px] uppercase tracking-wider text-slate-600">
                <th className="p-2 border border-slate-200">Category</th>
                <th className="p-2 border border-slate-200 text-right">Amount</th>
                <th className="p-2 border border-slate-200 text-right">Share</th>
              </tr>
            </thead>
            <tbody>
              {cashPieData.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-3 text-center text-slate-500">No cash activity for this period.</td>
                </tr>
              ) : (
                <>
                  {cashPieData.map((item) => (
                    <tr key={item.name}>
                      <td className="p-2 border border-slate-200 font-semibold">{item.name}</td>
                      <td className="p-2 border border-slate-200 text-right">{formatINR(item.value)}</td>
                      <td className="p-2 border border-slate-200 text-right">
                        {cashTotal > 0 ? `${((item.value / cashTotal) * 100).toFixed(1)}%` : '0%'}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td className="p-2 border border-slate-200 font-black">Net Flow</td>
                    <td className="p-2 border border-slate-200 text-right font-black" colSpan={2}>{formatINR(netCashFlow)}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>

          <h2 className="text-sm font-black uppercase tracking-wider text-slate-500 mb-3">Recent Income</h2>
          <table className="w-full text-sm border border-slate-200 border-collapse">
            <thead>
              <tr className="bg-slate-100 text-left text-[11px] uppercase tracking-wider text-slate-600">
                <th className="p-2 border border-slate-200">ID</th>
                <th className="p-2 border border-slate-200">Client</th>
                <th className="p-2 border border-slate-200 text-right">Amount</th>
                <th className="p-2 border border-slate-200 text-right">Received</th>
                <th className="p-2 border border-slate-200">Status</th>
                <th className="p-2 border border-slate-200">Date</th>
              </tr>
            </thead>
            <tbody>
              {todayIncome.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-3 text-center text-slate-500">No income records for this period.</td>
                </tr>
              ) : todayIncome.map((item) => (
                <tr key={item.id}>
                  <td className="p-2 border border-slate-200">#{item.id}</td>
                  <td className="p-2 border border-slate-200">{item.client || '—'}{item.category ? ` · ${item.category}` : ''}</td>
                  <td className="p-2 border border-slate-200 text-right">{formatINR(item.amount)}</td>
                  <td className="p-2 border border-slate-200 text-right">{formatINR(item.paidAmount ?? item.amount)}</td>
                  <td className="p-2 border border-slate-200">{item.status || '—'}</td>
                  <td className="p-2 border border-slate-200">{item.receivedDate || item.date || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
        <div>
          <p className="text-[12px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-1">Financial Overview</p>
          <h1 className="text-[28px] md:text-[32px] font-black text-slate-900 tracking-tighter leading-none">Dashboard</h1>
          <p className="text-slate-500 text-[13px] font-medium mt-2">
            Live income and expense summary
            {stats.dateFrom ? (
              <span className="text-slate-400"> · {formatRangeLabel(stats.dateFrom, stats.dateTo)}</span>
            ) : null}
            {isFetching ? <span className="ml-2 text-indigo-500 text-[11px] font-bold uppercase tracking-wider">Updating…</span> : null}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriod(p.id)}
                className={clsx(
                  "px-3.5 py-2 rounded-lg text-[12px] font-black transition-all",
                  period === p.id
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="relative" ref={exportMenuRef}>
            <button
              type="button"
              onClick={() => setExportMenuOpen((open) => !open)}
              disabled={!!exporting}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-[13px] font-bold hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              aria-haspopup="menu"
              aria-expanded={exportMenuOpen}
            >
              {exporting ? <Loader2 size={16} className="animate-spin text-indigo-600" /> : <Download size={16} strokeWidth={2.5} />}
              {exporting === 'pdf' ? 'Preparing PDF…' : exporting === 'csv' ? 'Exporting…' : 'Download'}
              {!exporting && <ChevronDown size={14} className={clsx('text-slate-400 transition-transform', exportMenuOpen && 'rotate-180')} />}
            </button>
            {exportMenuOpen && !exporting && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg z-30 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleExportPdf}
                  className="w-full px-4 py-3 text-left text-[13px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3 border-b border-slate-100"
                >
                  <FileText size={16} className="text-rose-500" />
                  <span>
                    <span className="block">PDF Report</span>
                    <span className="block text-[11px] font-medium text-slate-400">Formatted dashboard summary</span>
                  </span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleExportCsv}
                  className="w-full px-4 py-3 text-left text-[13px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3"
                >
                  <FileSpreadsheet size={16} className="text-emerald-600" />
                  <span>
                    <span className="block">Excel / CSV</span>
                    <span className="block text-[11px] font-medium text-slate-400">Spreadsheet financial data</span>
                  </span>
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('/income')}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[13px] font-bold hover:bg-black transition-all flex items-center gap-2 shadow-lg shadow-slate-900/10"
          >
            <Plus size={16} strokeWidth={3} />
            Income
          </button>
          <button
            onClick={() => navigate('/expense')}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-[13px] font-bold hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
          >
            <Plus size={16} strokeWidth={2.5} />
            Expense
          </button>
        </div>
      </div>

      {/* Primary summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
        <StatCard
          title="Total Income"
          value={formatINR(stats.totalIncome)}
          icon={Wallet}
          colorClass="bg-emerald-600 shadow-emerald-200"
          subLabel="Received in period"
          subValue={`${stats.incomeCount ?? 0} record${(stats.incomeCount ?? 0) === 1 ? '' : 's'}`}
          tone="positive"
        />
        <StatCard
          title="Total Expenses"
          value={formatINR(stats.totalExpenses)}
          icon={CreditCard}
          colorClass="bg-rose-500 shadow-rose-200"
          subLabel="Paid in period"
          subValue={`${stats.expenseCount ?? 0} record${(stats.expenseCount ?? 0) === 1 ? '' : 's'}`}
          tone="negative"
        />
        <StatCard
          title="Net Cash Flow"
          value={formatINR(netCashFlow)}
          icon={TrendingUp}
          colorClass={netCashFlow >= 0 ? "bg-indigo-600 shadow-indigo-200" : "bg-amber-500 shadow-amber-200"}
          subLabel="Income − Expenses"
          subValue={
            <span className={clsx("inline-flex items-center gap-1", netCashFlow >= 0 ? "text-emerald-600" : "text-rose-600")}>
              {netCashFlow >= 0 ? <ArrowUpRight size={14} strokeWidth={3} /> : <ArrowDownRight size={14} strokeWidth={3} />}
              {netCashFlow >= 0 ? 'Positive' : 'Negative'}
            </span>
          }
          tone={netCashFlow >= 0 ? 'positive' : 'negative'}
        />
      </div>

      {/* Outstanding cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
        <StatCard
          title="Outstanding Income"
          value={formatINR(stats.outstandingIncome)}
          icon={Clock}
          colorClass="bg-amber-500 shadow-amber-200"
          subLabel="Yet to be received"
          subValue={`Obligation ${formatINR(stats.incomeObligation)}`}
        />
        <StatCard
          title="Outstanding Expenses"
          value={formatINR(stats.outstandingExpenses)}
          icon={Receipt}
          colorClass="bg-violet-600 shadow-violet-200"
          subLabel="Yet to be paid"
          subValue={`Obligation ${formatINR(stats.expenseObligation)}`}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 md:p-6 flex flex-col h-[380px]">
          <div className="flex items-start justify-between mb-4 gap-3">
            <div>
              <h4 className="text-[15px] font-black text-slate-900 tracking-tight flex items-center gap-2">
                <BarChart3 size={18} className="text-indigo-600" />
                Income & Expense Trend
              </h4>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                Received income vs paid expenses
              </p>
            </div>
          </div>
          <div className="flex-1 w-full min-h-0 -ml-2">
            {trendData.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <EmptyState icon={BarChart3} title="No trend data" description="No income or expense activity in this period." />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }} interval="preserveStartEnd" />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }} tickFormatter={(v) => (Math.abs(v) >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`)} />
                  <RechartsTooltip
                    cursor={{ fill: '#f8fafc' }}
                    formatter={(value, name) => [formatINR(value), name === 'income' ? 'Income' : 'Expense']}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                  />
                  <Legend
                    verticalAlign="top"
                    height={28}
                    formatter={(value) => (value === 'income' ? 'Income' : 'Expense')}
                    wrapperStyle={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}
                  />
                  <Bar dataKey="income" fill="#10b981" radius={[5, 5, 0, 0]} maxBarSize={36} />
                  <Bar dataKey="expense" fill="#f43f5e" radius={[5, 5, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 md:p-6 flex flex-col h-[380px]">
          <div className="mb-2">
            <h4 className="text-[15px] font-black text-slate-900 tracking-tight flex items-center gap-2">
              <PieChartIcon size={18} className="text-emerald-600" />
              Cash Mix
            </h4>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              Received vs paid
            </p>
          </div>
          <div className="flex-1 w-full relative min-h-0">
            {cashPieData.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <EmptyState icon={PieChartIcon} title="No cash activity" description="Nothing received or paid in this period." />
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={cashPieData}
                      innerRadius={68}
                      outerRadius={96}
                      paddingAngle={6}
                      dataKey="value"
                    >
                      {cashPieData.map((entry, index) => (
                        <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(value) => formatINR(value)}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[22px] font-black text-slate-900 leading-none">{formatINR(Math.abs(netCashFlow))}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Net Flow</span>
                </div>
              </>
            )}
          </div>
          <div className="mt-2 space-y-1.5">
            {cashPieData.map((item, idx) => (
              <div key={item.name} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-100">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                <span className="text-[11px] font-bold text-slate-600 truncate">{item.name}</span>
                <span className="text-[11px] font-black text-slate-900 ml-auto">{formatINR(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent incomes in period */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-5 md:p-6 border-b border-slate-100 flex items-center justify-between gap-3">
          <div>
            <h4 className="text-[15px] font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Receipt size={18} className="text-indigo-600" />
              Recent Income
            </h4>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              Records in selected period
            </p>
          </div>
          <button onClick={() => navigate('/income')} className="text-[12px] font-black text-indigo-600 hover:text-indigo-700 flex items-center gap-1 shrink-0">
            View All <ArrowRight size={14} strokeWidth={3} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] border-b border-slate-100">
                <th className="px-5 md:px-6 py-3.5">ID</th>
                <th className="px-5 md:px-6 py-3.5">Client</th>
                <th className="px-5 md:px-6 py-3.5 text-right">Amount</th>
                <th className="px-5 md:px-6 py-3.5 text-right">Received</th>
                <th className="px-5 md:px-6 py-3.5">Status</th>
                <th className="px-5 md:px-6 py-3.5">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {todayIncome.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-12 text-center">
                    <EmptyState icon={Activity} title="No income records" description="No income activity found for this period." />
                  </td>
                </tr>
              ) : todayIncome.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                  onClick={() => navigate('/income')}
                >
                  <td className="px-5 md:px-6 py-3.5 font-mono text-[11px] font-black text-slate-400">#{item.id}</td>
                  <td className="px-5 md:px-6 py-3.5">
                    <div className="flex flex-col">
                      <span className="text-[13px] font-bold text-slate-900">{item.client || '—'}</span>
                      <span className="text-[11px] text-slate-400 font-medium">{item.category || 'General'}</span>
                    </div>
                  </td>
                  <td className="px-5 md:px-6 py-3.5 text-right text-[13px] font-black text-slate-800">
                    {formatINR(item.amount)}
                  </td>
                  <td className="px-5 md:px-6 py-3.5 text-right text-[13px] font-black text-emerald-600">
                    {formatINR(item.paidAmount ?? item.amount)}
                  </td>
                  <td className="px-5 md:px-6 py-3.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider">
                      {(item.paidAmount ?? 0) > 0 ? <CheckCircle2 size={10} className="text-emerald-500" /> : <Clock size={10} className="text-amber-500" />}
                      {item.status || '—'}
                    </span>
                  </td>
                  <td className="px-5 md:px-6 py-3.5 text-[12px] font-bold text-slate-500">
                    {item.receivedDate || item.date || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
