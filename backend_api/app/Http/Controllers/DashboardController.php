<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use App\Models\Invoice;
use App\Models\PlannerEvent;
use App\Models\Income;
use App\Models\Expense;
use App\Models\Client;

class DashboardController extends Controller
{
    /**
     * Dashboard stats with optional period filter: day | week | month | year.
     * Income/expense totals use the same paid/outstanding logic as Income & Expense modules.
     */
    public function stats(Request $request)
    {
        $period = strtolower((string) $request->input('period', 'month'));
        if (!in_array($period, ['day', 'week', 'month', 'year'], true)) {
            $period = 'month';
        }

        [$dateFrom, $dateTo] = $this->resolvePeriodRange($period);

        $incomeTotals = $this->summarizeIncomes($dateFrom, $dateTo);
        $expenseTotals = $this->summarizeExpenses($dateFrom, $dateTo);

        $totalIncomeReceived = $incomeTotals['received'];
        $totalIncomeOutstanding = $incomeTotals['outstanding'];
        $totalIncomeObligation = $incomeTotals['obligation'];

        $totalExpensePaid = $expenseTotals['paid'];
        $totalExpenseOutstanding = $expenseTotals['outstanding'];
        $totalExpenseObligation = $expenseTotals['obligation'];

        $netCashFlow = round($totalIncomeReceived - $totalExpensePaid, 2);

        $trend = $this->buildTrendSeries($period, $dateFrom, $dateTo);

        $totalClients = Client::count();
        $activeClients = Client::count();
        $totalInvoices = Invoice::count();
        $totalRevenue = (float) Invoice::where('status', 'Paid')->sum('grand_total');
        $pendingAmount = (float) Invoice::where('status', 'Pending')->sum('grand_total');

        $today = now()->toDateString();
        $todayIncome = (float) Income::whereDate('received_date', $today)->sum('amount');

        $recentIncomes = Income::query()
            ->whereDate('received_date', '>=', $dateFrom)
            ->whereDate('received_date', '<=', $dateTo)
            ->orderByDesc('received_date')
            ->orderByDesc('id')
            ->take(8)
            ->get(['id', 'client', 'amount', 'method', 'received_date', 'category', 'discount_amount', 'gst_amount', 'status', 'extra_installments', 'initial_deposit_amount', 'source'])
            ->map(function (Income $inc) {
                $paid = IncomeController::calculateIncomePaid($inc);
                $amount = (float) $inc->amount;
                $discount = (float) ($inc->discount_amount ?? 0);
                $gst = (float) ($inc->gst_amount ?? 0);
                $netTotal = max(0.0, $amount - $discount + $gst);

                return [
                    'id' => $inc->id,
                    'client' => $inc->client,
                    'amount' => round($netTotal, 2),
                    'paidAmount' => $paid,
                    'outstandingAmount' => round(max(0.0, $netTotal - $paid), 2),
                    'method' => $inc->method,
                    'receivedDate' => $inc->received_date
                        ? Carbon::parse($inc->received_date)->format('Y-m-d')
                        : null,
                    'category' => $inc->category,
                    'status' => IncomeController::getIncomeStatus($netTotal, $paid),
                ];
            });

        // Keep lightweight; avoid selecting columns that may not exist on older DBs
        $todaysEvents = PlannerEvent::whereDate('event_date', $today)
            ->orderBy('start_time')
            ->get(['id', 'title', 'event_date', 'start_time', 'end_time', 'category', 'status']);

        $invoiceStatusCounts = Invoice::selectRaw('status, count(*) as count')
            ->groupBy('status')
            ->get();

        return response()->json([
            'period' => $period,
            'dateFrom' => $dateFrom,
            'dateTo' => $dateTo,

            // Primary financial cards (cash movement in period)
            'totalIncome' => $totalIncomeReceived,
            'totalExpenses' => $totalExpensePaid,
            'netCashFlow' => $netCashFlow,

            // Outstanding (supported by existing accounting)
            'outstandingIncome' => $totalIncomeOutstanding,
            'outstandingExpenses' => $totalExpenseOutstanding,

            // Obligation totals (net record amounts in period)
            'incomeObligation' => $totalIncomeObligation,
            'expenseObligation' => $totalExpenseObligation,

            'incomeCount' => $incomeTotals['count'],
            'expenseCount' => $expenseTotals['count'],

            'trend' => $trend,

            // Legacy / secondary fields kept for compatibility
            'totalClients' => $totalClients,
            'activeClients' => $activeClients,
            'totalInvoices' => $totalInvoices,
            'totalRevenue' => round($totalRevenue, 2),
            'pendingAmount' => round($pendingAmount, 2),
            'todayIncome' => round($todayIncome, 2),
            'recentIncomes' => $recentIncomes,
            'invoiceStatusCounts' => $invoiceStatusCounts,
            'todaysEvents' => $todaysEvents,
            'monthlyRevenue' => $trend,
        ]);
    }

    /**
     * @return array{0:string,1:string} [dateFrom, dateTo] Y-m-d
     */
    private function resolvePeriodRange(string $period): array
    {
        $now = now();

        return match ($period) {
            'day' => [$now->toDateString(), $now->toDateString()],
            'week' => [
                $now->copy()->startOfWeek(Carbon::MONDAY)->toDateString(),
                $now->copy()->endOfWeek(Carbon::SUNDAY)->toDateString(),
            ],
            'year' => [
                $now->copy()->startOfYear()->toDateString(),
                $now->copy()->endOfYear()->toDateString(),
            ],
            default => [
                $now->copy()->startOfMonth()->toDateString(),
                $now->copy()->endOfMonth()->toDateString(),
            ],
        };
    }

    /**
     * @return array{received:float,outstanding:float,obligation:float,count:int}
     */
    private function summarizeIncomes(string $dateFrom, string $dateTo): array
    {
        $incomes = Income::query()
            ->whereDate('received_date', '>=', $dateFrom)
            ->whereDate('received_date', '<=', $dateTo)
            ->get();

        $received = 0.0;
        $outstanding = 0.0;
        $obligation = 0.0;

        foreach ($incomes as $income) {
            $amount = (float) $income->amount;
            $discount = (float) ($income->discount_amount ?? 0);
            $gst = (float) ($income->gst_amount ?? 0);
            $netTotal = max(0.0, $amount - $discount + $gst);
            $paid = IncomeController::calculateIncomePaid($income);

            $obligation += $netTotal;
            $received += $paid;
            $outstanding += max(0.0, $netTotal - $paid);
        }

        return [
            'received' => round($received, 2),
            'outstanding' => round($outstanding, 2),
            'obligation' => round($obligation, 2),
            'count' => $incomes->count(),
        ];
    }

    /**
     * @return array{paid:float,outstanding:float,obligation:float,count:int}
     */
    private function summarizeExpenses(string $dateFrom, string $dateTo): array
    {
        $expenses = Expense::query()
            ->whereDate('paid_date', '>=', $dateFrom)
            ->whereDate('paid_date', '<=', $dateTo)
            ->get();

        $paid = 0.0;
        $outstanding = 0.0;
        $obligation = 0.0;

        foreach ($expenses as $expense) {
            $amount = (float) $expense->amount;
            $discount = (float) ($expense->discount_amount ?? 0);
            $gst = (float) ($expense->gst_amount ?? 0);
            $netTotal = max(0.0, $amount - $discount + $gst);
            $paidAmt = ExpenseController::calculateExpensePaid($expense);

            $obligation += $netTotal;
            $paid += $paidAmt;
            $outstanding += max(0.0, $netTotal - $paidAmt);
        }

        return [
            'paid' => round($paid, 2),
            'outstanding' => round($outstanding, 2),
            'obligation' => round($obligation, 2),
            'count' => $expenses->count(),
        ];
    }

    /**
     * Build income/expense trend buckets for charts (received vs paid cash).
     *
     * @return array<int, array{label:string,income:float,expense:float}>
     */
    private function buildTrendSeries(string $period, string $dateFrom, string $dateTo): array
    {
        $from = Carbon::parse($dateFrom)->startOfDay();
        $to = Carbon::parse($dateTo)->endOfDay();

        $buckets = [];

        if ($period === 'day') {
            $label = $from->format('d M');
            $buckets[$label] = ['label' => $label, 'income' => 0.0, 'expense' => 0.0, 'from' => $from->toDateString(), 'to' => $to->toDateString()];
        } elseif ($period === 'week') {
            $cursor = $from->copy();
            while ($cursor->lte($to)) {
                $label = $cursor->format('D');
                $key = $cursor->toDateString();
                $buckets[$key] = ['label' => $label, 'income' => 0.0, 'expense' => 0.0, 'from' => $key, 'to' => $key];
                $cursor->addDay();
            }
        } elseif ($period === 'year') {
            $cursor = $from->copy()->startOfMonth();
            while ($cursor->lte($to)) {
                $label = $cursor->format('M');
                $key = $cursor->format('Y-m');
                $buckets[$key] = [
                    'label' => $label,
                    'income' => 0.0,
                    'expense' => 0.0,
                    'from' => $cursor->copy()->startOfMonth()->toDateString(),
                    'to' => $cursor->copy()->endOfMonth()->toDateString(),
                ];
                $cursor->addMonth();
            }
        } else {
            // month → daily buckets
            $cursor = $from->copy();
            while ($cursor->lte($to)) {
                $label = $cursor->format('d');
                $key = $cursor->toDateString();
                $buckets[$key] = ['label' => $label, 'income' => 0.0, 'expense' => 0.0, 'from' => $key, 'to' => $key];
                $cursor->addDay();
            }
        }

        $incomes = Income::query()
            ->whereDate('received_date', '>=', $dateFrom)
            ->whereDate('received_date', '<=', $dateTo)
            ->get();

        foreach ($incomes as $income) {
            if (!$income->received_date) {
                continue;
            }
            $date = Carbon::parse($income->received_date);
            $key = $this->bucketKeyForPeriod($period, $date);
            if (!isset($buckets[$key])) {
                continue;
            }
            $buckets[$key]['income'] += IncomeController::calculateIncomePaid($income);
        }

        $expenses = Expense::query()
            ->whereDate('paid_date', '>=', $dateFrom)
            ->whereDate('paid_date', '<=', $dateTo)
            ->get();

        foreach ($expenses as $expense) {
            if (!$expense->paid_date) {
                continue;
            }
            $date = Carbon::parse($expense->paid_date);
            $key = $this->bucketKeyForPeriod($period, $date);
            if (!isset($buckets[$key])) {
                continue;
            }
            $buckets[$key]['expense'] += ExpenseController::calculateExpensePaid($expense);
        }

        return array_values(array_map(function ($bucket) {
            return [
                'label' => $bucket['label'],
                'month' => $bucket['label'], // legacy alias used by older chart code
                'income' => round($bucket['income'], 2),
                'expense' => round($bucket['expense'], 2),
                'revenue' => round($bucket['income'], 2), // legacy alias
            ];
        }, $buckets));
    }

    private function bucketKeyForPeriod(string $period, Carbon $date): string
    {
        return match ($period) {
            'day' => $date->format('d M'),
            'year' => $date->format('Y-m'),
            default => $date->toDateString(),
        };
    }
}
