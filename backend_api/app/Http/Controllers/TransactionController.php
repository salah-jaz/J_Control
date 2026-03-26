<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class TransactionController extends Controller
{
    private static function mapTransaction($txn)
    {
        $party = '';
        $incomeStatus = null;
        $invoiceNo = null;
        if ($txn->related_type === 'App\Models\Income' && $txn->related) {
            $party = $txn->related->client;
            $incomeStatus = $txn->related->status;
            $invoiceNo = $txn->related->invoice_no ?? null;
        } elseif ($txn->related_type === 'App\Models\Expense' && $txn->related) {
            $party = $txn->related->vendor;
        }

        $bankName = $txn->bankAccount
            ? ($txn->bankAccount->bank_name . ' - ' . $txn->bankAccount->account_number)
            : ($txn->bank ?? null);

        $filterStatus = $incomeStatus === 'Fully Paid' ? 'Paid' : ($incomeStatus === 'Partially Paid' ? 'Partial' : ($incomeStatus === 'Unpaid' ? 'Unpaid' : null));

        return [
            'id' => (int) $txn->id,
            'relatedId' => $txn->related_id ? (int) $txn->related_id : null,
            'transactionId' => $txn->reference_id ?? 'TXN-' . $txn->id,
            'type' => $txn->type,
            'date' => $txn->date,
            'amount' => $txn->amount,
            'currency' => $txn->currency,
            'category' => $txn->category,
            'method' => $txn->method,
            'bank' => $txn->bank,
            'bankAccountId' => $txn->bank_account_id,
            'bankName' => $bankName,
            'reference' => $txn->reference_id,
            'description' => $txn->description,
            'status' => $txn->status,
            'party' => $party,
            'incomeStatus' => $filterStatus,
            'invoiceNo' => $invoiceNo,
        ];
    }

    public function index(Request $request)
    {
        $perPage = (int) $request->get('per_page', 20);
        $perPage = $perPage >= 1 && $perPage <= 100 ? $perPage : 20;

        $query = \App\Models\Transaction::with(['related', 'bankAccount']);

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('bank_account_id')) {
            $query->where('bank_account_id', $request->bank_account_id);
        }
        if ($request->filled('date_from')) {
            $query->whereDate('date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('date', '<=', $request->date_to);
        }
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('reference_id', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhereRaw('CAST(amount AS CHAR) LIKE ?', ["%{$search}%"])
                    ->orWhereHasMorph('related', [\App\Models\Income::class], function ($m) use ($search) {
                        $m->where('client', 'like', "%{$search}%");
                    })
                    ->orWhereHasMorph('related', [\App\Models\Expense::class], function ($m) use ($search) {
                        $m->where('vendor', 'like', "%{$search}%");
                    });
            });
        }

        $paginator = $query->orderBy('created_at', 'desc')->paginate($perPage);
        $paginator->getCollection()->transform(function ($txn) {
            return self::mapTransaction($txn);
        });

        return $paginator;
    }

    /**
     * GET /transactions/summary - for stats cards with filters.
     */
    public function summary(Request $request)
    {
        $query = \App\Models\Transaction::query();

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('bank_account_id')) {
            $query->where('bank_account_id', $request->bank_account_id);
        }
        if ($request->filled('date_from')) {
            $query->whereDate('date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('date', '<=', $request->date_to);
        }
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('reference_id', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhereHasMorph('related', [\App\Models\Income::class], function ($m) use ($search) {
                        $m->where('client', 'like', "%{$search}%");
                    })
                    ->orWhereHasMorph('related', [\App\Models\Expense::class], function ($m) use ($search) {
                        $m->where('vendor', 'like', "%{$search}%");
                    });
            });
        }

        $totalIncomes = (clone $query)->where('type', 'Income')->sum('amount');
        $totalExpenses = (clone $query)->where('type', 'Expense')->sum('amount');
        $recentCount = (clone $query)->where('date', '>=', now()->subDays(7)->toDateString())->count();

        return response()->json([
            'totalTransactions' => (clone $query)->count(),
            'totalIncome' => round((float)$totalIncomes, 2),
            'totalExpense' => round((float)$totalExpenses, 2),
            'recentCount' => $recentCount,
        ]);
    }

    /**
     * Get a single transaction by id (primary key).
     */
    public function show($id)
    {
        $txn = \App\Models\Transaction::with(['related', 'bankAccount'])->findOrFail($id);
        return response()->json(self::mapTransaction($txn));
    }
}
