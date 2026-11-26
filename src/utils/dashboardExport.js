/**
 * Dashboard export helpers — builds spreadsheet rows from live dashboard stats.
 * Reuses the shared CSV downloader used by Income / Expense / Reports.
 */

import { exportToCSV } from './csvExport';

const PERIOD_LABELS = {
  day: 'Day',
  week: 'Week',
  month: 'Month',
  year: 'Year',
};

export const formatDashboardINR = (value) =>
  `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export const getPeriodLabel = (period) => PERIOD_LABELS[period] || 'Month';

export const formatDashboardRange = (dateFrom, dateTo) => {
  if (!dateFrom || !dateTo) return '';
  if (dateFrom === dateTo) return dateFrom;
  return `${dateFrom} → ${dateTo}`;
};

export const buildDashboardReportTitle = (period) =>
  `J-Control Dashboard Report (${getPeriodLabel(period)})`;

export const buildDashboardExportFilename = (period, format) => {
  const stamp = new Date().toISOString().slice(0, 10);
  return `J_Control_Dashboard_${getPeriodLabel(period)}_${stamp}.${format === 'pdf' ? 'pdf' : 'csv'}`;
};

/**
 * Flatten dashboard stats into CSV-friendly rows covering summaries, trend, and cash mix.
 */
export const buildDashboardCsvRows = ({
  period,
  stats = {},
  trendData = [],
  cashPieData = [],
  recentIncome = [],
}) => {
  const periodLabel = getPeriodLabel(period);
  const range = formatDashboardRange(stats.dateFrom, stats.dateTo);
  const netCashFlow = Number(stats.netCashFlow ?? 0);
  const totalIncome = Number(stats.totalIncome || 0);
  const totalExpenses = Number(stats.totalExpenses || 0);
  const cashTotal = totalIncome + totalExpenses;

  const rows = [
    {
      Section: 'Report',
      Label: 'Title',
      Income: '',
      Expense: '',
      Value: buildDashboardReportTitle(period),
    },
    {
      Section: 'Report',
      Label: 'Period',
      Income: '',
      Expense: '',
      Value: periodLabel,
    },
    {
      Section: 'Report',
      Label: 'Date Range',
      Income: '',
      Expense: '',
      Value: range || '—',
    },
    {
      Section: 'Report',
      Label: 'Generated At',
      Income: '',
      Expense: '',
      Value: new Date().toLocaleString('en-IN'),
    },
    {
      Section: 'Summary',
      Label: 'Total Income',
      Income: formatDashboardINR(totalIncome),
      Expense: '',
      Value: formatDashboardINR(totalIncome),
    },
    {
      Section: 'Summary',
      Label: 'Total Expenses',
      Income: '',
      Expense: formatDashboardINR(totalExpenses),
      Value: formatDashboardINR(totalExpenses),
    },
    {
      Section: 'Summary',
      Label: 'Net Cash Flow',
      Income: '',
      Expense: '',
      Value: formatDashboardINR(netCashFlow),
    },
    {
      Section: 'Summary',
      Label: 'Income Records',
      Income: '',
      Expense: '',
      Value: String(stats.incomeCount ?? 0),
    },
    {
      Section: 'Summary',
      Label: 'Expense Records',
      Income: '',
      Expense: '',
      Value: String(stats.expenseCount ?? 0),
    },
    {
      Section: 'Outstanding',
      Label: 'Outstanding Income',
      Income: '',
      Expense: '',
      Value: formatDashboardINR(stats.outstandingIncome),
    },
    {
      Section: 'Outstanding',
      Label: 'Income Obligation',
      Income: '',
      Expense: '',
      Value: formatDashboardINR(stats.incomeObligation),
    },
    {
      Section: 'Outstanding',
      Label: 'Outstanding Expenses',
      Income: '',
      Expense: '',
      Value: formatDashboardINR(stats.outstandingExpenses),
    },
    {
      Section: 'Outstanding',
      Label: 'Expense Obligation',
      Income: '',
      Expense: '',
      Value: formatDashboardINR(stats.expenseObligation),
    },
  ];

  if (trendData.length === 0) {
    rows.push({
      Section: 'Trend',
      Label: 'No trend data',
      Income: formatDashboardINR(0),
      Expense: formatDashboardINR(0),
      Value: '',
    });
  } else {
    trendData.forEach((row) => {
      const income = Number(row.income || 0);
      const expense = Number(row.expense || 0);
      rows.push({
        Section: 'Trend',
        Label: row.name || '',
        Income: formatDashboardINR(income),
        Expense: formatDashboardINR(expense),
        Value: formatDashboardINR(income - expense),
      });
    });
  }

  if (cashPieData.length === 0) {
    rows.push({
      Section: 'Cash Mix',
      Label: 'No cash activity',
      Income: '',
      Expense: '',
      Value: formatDashboardINR(0),
    });
  } else {
    cashPieData.forEach((item) => {
      const share = cashTotal > 0 ? ((Number(item.value) / cashTotal) * 100).toFixed(1) : '0.0';
      rows.push({
        Section: 'Cash Mix',
        Label: item.name,
        Income: item.name.toLowerCase().includes('income') ? formatDashboardINR(item.value) : '',
        Expense: item.name.toLowerCase().includes('expense') ? formatDashboardINR(item.value) : '',
        Value: `${formatDashboardINR(item.value)} (${share}%)`,
      });
    });
    rows.push({
      Section: 'Cash Mix',
      Label: 'Net Flow',
      Income: '',
      Expense: '',
      Value: formatDashboardINR(netCashFlow),
    });
  }

  if (recentIncome.length > 0) {
    recentIncome.forEach((item) => {
      rows.push({
        Section: 'Recent Income',
        Label: `#${item.id} ${item.client || '—'} (${item.receivedDate || item.date || '—'})`,
        Income: formatDashboardINR(item.paidAmount ?? item.amount),
        Expense: '',
        Value: formatDashboardINR(item.amount),
      });
    });
  }

  return rows;
};

export const exportDashboardCsv = (payload) => {
  const rows = buildDashboardCsvRows(payload);
  const filename = buildDashboardExportFilename(payload.period, 'csv').replace(/\.csv$/i, '');
  exportToCSV(rows, filename);
  return filename;
};
