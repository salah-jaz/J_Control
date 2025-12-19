<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Income;
use App\Models\Expense;
use App\Models\Client;
use App\Models\BankAccount;
use App\Models\Invoice;
use DB;

class ReportsController extends Controller
{
    public function summary(Request $request)
    {
        $queryIncome = Income::query();
        $queryExpense = Expense::query();

        $this->applyFilters($queryIncome, $request, 'income');
        $this->applyFilters($queryExpense, $request, 'expense');

        $totalIncome = $queryIncome->sum('amount');
        $totalExpense = $queryExpense->sum('amount');
        $netProfit = $totalIncome - $totalExpense;

        return response()->json([
            'totalIncome' => $totalIncome,
            'totalExpense' => $totalExpense,
            'netProfit' => $netProfit,
            'closingBalance' => 0 // To be implemented
        ]);
    }

    public function details(Request $request)
    {
        $type = $request->query('type');
        $data = [];

        if ($type === 'income') {
            $query = Income::query();
            $this->applyFilters($query, $request, 'income');
            $data = $query->orderBy('received_date', 'desc')->get()->map(function($item) {
                return [
                    'id' => $item->id,
                    'date' => $item->received_date,
                    'description' => ($item->source ?: 'Income') . ' - ' . ($item->client ?: 'Unknown'),
                    'debit' => '-',
                    'credit' => $item->amount,
                    'balance' => 0 
                ];
            });
        } elseif ($type === 'expense') {
            $query = Expense::query();
            $this->applyFilters($query, $request, 'expense');
            $data = $query->orderBy('paid_date', 'desc')->get()->map(function($item) {
                return [
                    'id' => $item->id,
                    'date' => $item->paid_date,
                    'description' => ($item->expense_type ?: 'Expense') . ' - ' . ($item->vendor ?: 'Unknown'),
                    'debit' => $item->amount,
                    'credit' => '-',
                    'balance' => 0
                ];
            });
        } elseif ($type === 'invoices') {
            $query = Invoice::query();
            $this->applyFilters($query, $request, 'invoice');
            $data = $query->orderBy('date', 'desc')->get()->map(function($item) {
                return [
                    'id' => $item->id,
                    'date' => $item->date ? $item->date->format('Y-m-d') : '',
                    'description' => 'Invoice #' . $item->id . ' - ' . ($item->client_name ?: 'Unknown'),
                    'debit' => $item->grand_total,
                    'credit' => '-',
                    'balance' => 0
                ];
            });
        } elseif ($type === 'pl' || $type === 'all') { // Profit & Loss / Combined
             $incomes = Income::query();
             $this->applyFilters($incomes, $request, 'income');
             $incomeData = $incomes->get()->map(function($item) {
                 return [
                    'id' => 'inc_'.$item->id,
                    'date' => $item->received_date,
                    'description' => 'Income: ' . ($item->source ?: 'General'),
                    'debit' => '-',
                    'credit' => $item->amount,
                    'timestamp' => strtotime($item->received_date)
                 ];
             });

             $expenses = Expense::query();
             $this->applyFilters($expenses, $request, 'expense');
             $expenseData = $expenses->get()->map(function($item) {
                 return [
                    'id' => 'exp_'.$item->id,
                    'date' => $item->paid_date,
                    'description' => 'Expense: ' . ($item->expense_type ?: 'General'),
                    'debit' => $item->amount,
                    'credit' => '-',
                    'timestamp' => strtotime($item->paid_date)
                 ];
             });

             $merged = $incomeData->concat($expenseData)->sortByDesc('timestamp')->values();
             $data = $merged;
        }

        return response()->json($data);
    }

    public function filters()
    {
        $clients = Income::distinct()->pluck('client')->filter()->values();
        $vendors = Expense::distinct()->pluck('vendor')->filter()->values();
        $invClients = Invoice::distinct()->pluck('client_name')->filter()->values();
        
        $companies = $clients->merge($vendors)->merge($invClients)->unique()->values();

        $accounts = DB::table('incomes')->select('bank')->union(DB::table('expenses')->select('bank'))->distinct()->pluck('bank')->filter()->values();
        $categories = DB::table('incomes')->select('category')->union(DB::table('expenses')->select('category'))->distinct()->pluck('category')->filter()->values();

        return response()->json([
            'companies' => $companies,
            'accounts' => $accounts,
            'categories' => $categories
        ]);
    }

    private function applyFilters($query, $request, $type)
    {
        if ($request->filled('from')) {
            $dateField = $type === 'income' ? 'received_date' : ($type === 'expense' ? 'paid_date' : 'date');
            $query->whereDate($dateField, '>=', $request->from);
        }
        if ($request->filled('to')) {
             $dateField = $type === 'income' ? 'received_date' : ($type === 'expense' ? 'paid_date' : 'date');
             $query->whereDate($dateField, '<=', $request->to);
        }
        if ($request->filled('company')) {
             if ($type === 'income') {
                 $query->where('client', $request->company);
             } elseif ($type === 'expense') {
                 $query->where('vendor', $request->company);
             } elseif ($type === 'invoice') {
                 $query->where('client_name', $request->company);
             }
        }
        if ($request->filled('account') && $type !== 'invoice') { // Invoices don't have bank account usually until paid
            $query->where('bank', $request->account);
        }
        if ($request->filled('category') && $type !== 'invoice') {
            $query->where('category', $request->category);
        }
    }
}
