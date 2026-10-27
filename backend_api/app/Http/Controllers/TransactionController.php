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
        } elseif (!$txn->related && strtolower((string)$txn->type) === 'expense') {
            $matchedExpense = null;
            if ($txn->related_id) {
                $matchedExpense = \App\Models\Expense::find($txn->related_id);
            } elseif ($txn->reference_id) {
                if (preg_match('/^EXP-PAY-(\d+)/', $txn->reference_id, $m)) {
                    $matchedExpense = \App\Models\Expense::find($m[1]);
                } else {
                    $matchedExpense = \App\Models\Expense::where('transaction_id', $txn->reference_id)
                        ->orWhere('reference_number', $txn->reference_id)
                        ->orWhere('bill_no', $txn->reference_id)
                        ->first();
                }
            }
            if ($matchedExpense) {
                $txn->setRelation('related', $matchedExpense);
                $party = $matchedExpense->vendor;
            }
        }

        $bankAccount = $txn->bankAccount;
        $isCash = false;
        if ($bankAccount) {
            $isCash = strtolower($bankAccount->bank_name ?? '') === 'cash'
                || strtolower($bankAccount->account_type ?? '') === 'cash'
                || str_contains(strtolower($bankAccount->account_name ?? ''), 'cash')
                || strtolower($bankAccount->account_number ?? '') === 'cash';
        } elseif ($txn->bank) {
            $isCash = strtolower($txn->bank) === 'cash' || str_contains(strtolower($txn->bank), 'cash');
        } elseif ($txn->method) {
            $isCash = strtolower($txn->method) === 'cash';
        }

        if ($bankAccount) {
            $bankName = $isCash 
                ? ($bankAccount->account_name ?: 'Cash Account')
                : ($bankAccount->bank_name ?: ($bankAccount->account_name ?: 'Bank Account'));
        } elseif ($txn->bank) {
            $bankName = $isCash ? 'Cash Account' : $txn->bank;
        } else {
            $bankName = $isCash ? 'Cash Account' : '—';
        }

        $userDescription = null;
        $isOpeningBalance = $txn->category === 'Opening Balance'
            || ($txn->reference_id && str_starts_with($txn->reference_id, 'BANK-OB-'))
            || ($txn->related_type === 'App\Models\Income' && $txn->related && ($txn->related->source === 'Opening Balance' || $txn->related->category === 'Opening Balance'));

        if ($isOpeningBalance) {
            if (empty($party)) {
                $party = $bankAccount ? ($bankAccount->account_name ?: $bankAccount->bank_name) : $bankName;
            }
            $description = 'Opening Balance';
        } elseif ($txn->related_type === 'App\Models\Income' && $txn->related) {
            $userDescription = $txn->related->description ?: ($txn->related->notes ?: null);
            $ref = $txn->reference_id ?: ($txn->related->reference_number ?: $txn->related->invoice_no);
            $description = \App\Services\LedgerService::generateSourceBasedDescription(
                $txn->related->source,
                $party,
                $ref,
                $txn->category ?: $txn->related->category,
                $txn->description
            );
        } elseif (($txn->related_type === 'App\Models\Expense' || strtolower((string)$txn->type) === 'expense') && $txn->related) {
            $userDescription = $txn->related->description ?: ($txn->related->notes ?: null);
            $expense = $txn->related;
            $vendor = $expense->vendor ?: $party;
            $title = $expense->expense_type;
            $description = \App\Services\LedgerService::generateExpenseDescription(
                $vendor,
                $title,
                $txn->description
            );
            if ($txn->description !== $description && ($txn->description === null || str_starts_with(strtolower((string)$txn->description), 'expense payment') || str_starts_with(strtolower((string)$txn->description), 'expense for'))) {
                $txn->update(['description' => $description]);
            }
        } else {
            $description = $txn->description ?: ($party ? "Transaction for {$party}" : 'Transaction record');
        }

        $filterStatus = $incomeStatus === 'Fully Paid' ? 'Paid' : ($incomeStatus === 'Partially Paid' ? 'Partial' : ($incomeStatus === 'Unpaid' ? 'Unpaid' : null));

        $prevBal = $txn->previous_balance !== null ? (float) $txn->previous_balance : null;
        $currBal = $txn->current_balance !== null ? (float) $txn->current_balance : null;

        return [
            'id' => (int) $txn->id,
            'relatedId' => $txn->related_id ? (int) $txn->related_id : null,
            'transactionId' => $txn->reference_id ?? 'TXN-' . $txn->id,
            'type' => $txn->type,
            'date' => $txn->date,
            'amount' => $txn->amount,
            'previous_balance' => $prevBal,
            'current_balance' => $currBal,
            'previousBalance' => $prevBal,
            'currentBalance' => $currBal,
            'currency' => $txn->currency,
            'category' => $txn->category,
            'method' => $txn->method,
            'bank' => $bankName,
            'bankAccountId' => $txn->bank_account_id,
            'bankAccount' => $bankAccount,
            'bankName' => $bankName,
            'reference' => $txn->reference_id,
            'description' => $description,
            'userDescription' => $userDescription,
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
                    ->orWhere('bank', 'like', "%{$search}%")
                    ->orWhereRaw('CAST(amount AS CHAR) LIKE ?', ["%{$search}%"])
                    ->orWhereHasMorph('related', [\App\Models\Income::class], function ($m) use ($search) {
                        $m->where('client', 'like', "%{$search}%");
                    })
                    ->orWhereHasMorph('related', [\App\Models\Expense::class], function ($m) use ($search) {
                        $m->where('vendor', 'like', "%{$search}%");
                    })
                    ->orWhereHas('bankAccount', function ($b) use ($search) {
                        $b->where('bank_name', 'like', "%{$search}%")
                          ->orWhere('account_name', 'like', "%{$search}%");
                    });
            });
        }

        $paginator = $query->orderBy('date', 'desc')->orderBy('created_at', 'desc')->orderBy('id', 'desc')->paginate($perPage);
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
                    ->orWhere('bank', 'like', "%{$search}%")
                    ->orWhereRaw('CAST(amount AS CHAR) LIKE ?', ["%{$search}%"])
                    ->orWhereHasMorph('related', [\App\Models\Income::class], function ($m) use ($search) {
                        $m->where('client', 'like', "%{$search}%");
                    })
                    ->orWhereHasMorph('related', [\App\Models\Expense::class], function ($m) use ($search) {
                        $m->where('vendor', 'like', "%{$search}%");
                    })
                    ->orWhereHas('bankAccount', function ($b) use ($search) {
                        $b->where('bank_name', 'like', "%{$search}%")
                          ->orWhere('account_name', 'like', "%{$search}%");
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
