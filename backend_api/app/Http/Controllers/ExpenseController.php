<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Expense;
use App\Models\BankAccount;
use App\Models\Transaction;
use App\Helpers\FinancialValidator;
use App\Services\LedgerService;

class ExpenseController extends Controller
{
    /**
     * Calculate actual paid amount for an expense record based on recorded payments.
     * Unpaid milestones or pending expenses are NOT counted as paid.
     */
    public static function calculateExpensePaid(Expense $expense): float
    {
        $amount = (float) $expense->amount;
        $discount = (float) ($expense->discount_amount ?? 0);
        $gst = (float) ($expense->gst_amount ?? 0);
        $netTotal = max(0.0, $amount - $discount + $gst);

        // 1. If split payment with milestones
        if (!empty($expense->extra_installments) && is_array($expense->extra_installments)) {
            $paid = 0.0;
            foreach ($expense->extra_installments as $inst) {
                $status = strtolower(trim((string)($inst['status'] ?? '')));
                if (in_array($status, ['paid', 'completed']) || !empty($inst['is_paid'])) {
                    $paid += (float) ($inst['amount'] ?? 0);
                }
            }
            return min($netTotal, round($paid, 2));
        }

        // 2. Single payment: deposit recorded
        if ($expense->initial_deposit_amount !== null && (float) $expense->initial_deposit_amount > 0) {
            return min($netTotal, round((float) $expense->initial_deposit_amount, 2));
        }

        // 3. Fallback: check related transactions directly in the transactions table
        $txSum = Transaction::where('related_id', $expense->id)
            ->where('related_type', Expense::class)
            ->sum('amount');
        if ($txSum > 0) {
            return min($netTotal, round((float) $txSum, 2));
        }

        // 4. Fallback for legacy records where status was explicitly set
        $status = strtolower(trim((string) $expense->status));
        if (in_array($status, ['fully paid', 'paid', 'cleared', 'completed'])) {
            return $netTotal;
        }

        return 0.0;
    }

    /**
     * Get dynamic status from total vs paid:
     * - Pending: No payment made (paid <= 0)
     * - Partially Paid: Some payment made, outstanding balance remains (0 < paid < total)
     * - Fully Paid: Complete payable amount paid (paid >= total)
     */
    public static function getExpenseStatus(float $totalAmount, float $paidAmount): string
    {
        $totalAmount = round($totalAmount, 2);
        $paidAmount = round($paidAmount, 2);

        if ($paidAmount <= 0) {
            return 'Pending';
        }
        if ($paidAmount >= $totalAmount) {
            return 'Fully Paid';
        }
        return 'Partially Paid';
    }

    /**
     * Build list of payments (amount, method, bank_account_id, date, reference_id, description)
     * for actual paid payments only.
     */
    private static function getPaymentEntries(Expense $expense): array
    {
        $entries = [];
        $baseDate = $expense->paid_date ?: now()->toDateString();

        // Split payments
        if (!empty($expense->extra_installments) && is_array($expense->extra_installments)) {
            foreach ($expense->extra_installments as $idx => $inst) {
                $status = strtolower(trim((string)($inst['status'] ?? '')));
                $amt = (float) ($inst['amount'] ?? 0);
                $isPaid = in_array($status, ['paid', 'completed']) || (!empty($inst['is_paid']) && $status !== 'pending');
                if ($isPaid && $amt > 0) {
                    $method = !empty($inst['method']) ? $inst['method'] : 'Bank Account';
                    $bankId = isset($inst['bank_account_id']) ? (int) $inst['bank_account_id'] : null;
                    $entries[] = [
                        'amount' => $amt,
                        'method' => $method,
                        'bank_account_id' => $bankId,
                        'date' => !empty($inst['paid_date']) ? $inst['paid_date'] : (!empty($inst['date']) ? $inst['date'] : $baseDate),
                        'reference_id' => !empty($inst['transaction_id']) ? $inst['transaction_id'] : ('EXP-PAY-' . $expense->id . '-' . ($idx + 1)),
                        'description' => LedgerService::generateMilestoneDescription($idx + 1, $expense->vendor, $expense->expense_type, $inst['note'] ?? null),
                    ];
                }
            }
            return $entries;
        }

        // Single payment
        $deposit = (float) ($expense->initial_deposit_amount ?? 0);
        if ($deposit > 0) {
            $method = $expense->method ?: 'Bank Account';
            $bankId = $expense->bank_account_id ?: $expense->initial_deposit_bank_id;
            $entries[] = [
                'amount' => $deposit,
                'method' => $method,
                'bank_account_id' => $bankId,
                'date' => $baseDate,
                'reference_id' => $expense->transaction_id,
                'description' => LedgerService::generateExpenseDescription($expense->vendor, $expense->expense_type),
            ];
        }

        return $entries;
    }

    /**
     * Debit bank balances and create Expense transactions for given payment entries.
     */
    private static function applyExpensePayments(Expense $expense, array $paymentEntries): void
    {
        foreach ($paymentEntries as $entry) {
            $bank = null;
            $method = $entry['method'] ?? $expense->method ?? 'Bank Account';
            $bankId = $entry['bank_account_id'] ?? null;

            if ($bankId) {
                $bank = BankAccount::find($bankId);
                if ($bank) {
                    $bank->current_balance = round((float) ($bank->current_balance ?? 0) - $entry['amount'], 2);
                    $bank->save();
                }
            }

            Transaction::create([
                'type' => 'Expense',
                'date' => $entry['date'],
                'amount' => $entry['amount'],
                'currency' => $expense->currency ?? 'INR',
                'category' => $expense->category,
                'method' => $method,
                'bank' => $bank ? ($bank->bank_name ?? $bank->nick_name) : ($method === 'Cash' ? 'Cash' : null),
                'bank_account_id' => $bank ? $bank->id : null,
                'reference_id' => $entry['reference_id'] ?? $expense->transaction_id,
                'description' => $entry['description'] ?? LedgerService::generateExpenseDescription($expense->vendor, $expense->expense_type),
                'status' => 'Completed',
                'related_id' => $expense->id,
                'related_type' => Expense::class,
            ]);
        }
    }

    /**
     * Reverse transactions and refund bank balances for an expense (by its related transactions).
     */
    private static function reverseExpensePayments(Expense $expense): void
    {
        $transactions = Transaction::where('related_id', $expense->id)
            ->where('related_type', Expense::class)
            ->get();

        foreach ($transactions as $tx) {
            if ($tx->bank_account_id) {
                $bank = BankAccount::find($tx->bank_account_id);
                if ($bank) {
                    $bank->current_balance = round((float) ($bank->current_balance ?? 0) + (float) $tx->amount, 2);
                    $bank->save();
                }
            }
            $tx->delete();
        }
    }

    /**
     * List expenses with optional filters and pagination.
     * Query params: search, status, category, bank_account_id, date_from, date_to, page, per_page
     */
    public function index(Request $request)
    {
        BankAccount::ensureDefaultCashAccount();
        $query = Expense::with(['bankAccount', 'transactions'])->latest('id');

        if ($request->filled('search')) {
            $term = '%' . $request->input('search') . '%';
            $query->where(function ($q) use ($term) {
                $q->where('vendor', 'like', $term)
                    ->orWhere('expense_type', 'like', $term)
                    ->orWhere('category', 'like', $term)
                    ->orWhere('bill_no', 'like', $term)
                    ->orWhere('reference_number', 'like', $term)
                    ->orWhere('notes', 'like', $term)
                    ->orWhere('description', 'like', $term);
            });
        }

        if ($request->filled('status') && strtolower($request->input('status')) !== 'all') {
            $status = $request->input('status');
            if (in_array($status, ['Paid', 'Fully Paid'])) {
                $query->whereIn('status', ['Fully Paid', 'Paid']);
            } elseif (in_array($status, ['Partial', 'Partially Paid'])) {
                $query->whereIn('status', ['Partially Paid', 'Partial']);
            } elseif (in_array($status, ['Unpaid', 'Pending'])) {
                $query->whereIn('status', ['Pending', 'Unpaid']);
            } else {
                $query->where('status', $status);
            }
        }

        if ($request->filled('category')) {
            $query->where('category', $request->input('category'));
        }

        if ($request->filled('bank_account_id')) {
            $bankId = $request->input('bank_account_id');
            $query->where(function ($q) use ($bankId) {
                $q->where('bank_account_id', $bankId)
                  ->orWhere('initial_deposit_bank_id', $bankId);
            });
        }

        if ($request->filled('date_from')) {
            $query->whereDate('paid_date', '>=', $request->input('date_from'));
        }
        if ($request->filled('date_to')) {
            $query->whereDate('paid_date', '<=', $request->input('date_to'));
        }

        $perPage = max(1, min(100, (int) $request->input('per_page', 20)));
        $paginator = $query->paginate($perPage);
        $paginator->getCollection()->transform(function ($expense) {
            if ($expense->transactions->isEmpty()) {
                $resolved = $expense->resolveTransactions();
                if ($resolved->isNotEmpty()) {
                    $expense->setRelation('transactions', $resolved);
                }
            }
            return $expense;
        });
        return $paginator;
    }

    public function show($id)
    {
        $expense = Expense::with(['bankAccount', 'transactions'])->findOrFail($id);
        if ($expense->transactions->isEmpty()) {
            $resolved = $expense->resolveTransactions();
            if ($resolved->isNotEmpty()) {
                $expense->setRelation('transactions', $resolved);
            }
        }
        return response()->json($expense);
    }

    /**
     * GET /expenses/summary - filter-aware aggregates matching financial records.
     * Total Value: Total expense net amount
     * Paid: Actual amount debited/paid (no double counting, no unpaid amounts)
     * Outstanding: Total unpaid amount across expenses
     * Total Expenses: Count of expense records
     */
    public function summary(Request $request)
    {
        $query = Expense::query();

        if ($request->filled('search')) {
            $term = '%' . $request->input('search') . '%';
            $query->where(function ($q) use ($term) {
                $q->where('vendor', 'like', $term)
                    ->orWhere('expense_type', 'like', $term)
                    ->orWhere('category', 'like', $term)
                    ->orWhere('bill_no', 'like', $term)
                    ->orWhere('reference_number', 'like', $term)
                    ->orWhere('notes', 'like', $term)
                    ->orWhere('description', 'like', $term);
            });
        }

        if ($request->filled('status') && strtolower($request->input('status')) !== 'all') {
            $status = $request->input('status');
            if (in_array($status, ['Paid', 'Fully Paid'])) {
                $query->whereIn('status', ['Fully Paid', 'Paid']);
            } elseif (in_array($status, ['Partial', 'Partially Paid'])) {
                $query->whereIn('status', ['Partially Paid', 'Partial']);
            } elseif (in_array($status, ['Unpaid', 'Pending'])) {
                $query->whereIn('status', ['Pending', 'Unpaid']);
            } else {
                $query->where('status', $status);
            }
        }

        if ($request->filled('category')) {
            $query->where('category', $request->input('category'));
        }

        if ($request->filled('bank_account_id')) {
            $bankId = $request->input('bank_account_id');
            $query->where(function ($q) use ($bankId) {
                $q->where('bank_account_id', $bankId)
                  ->orWhere('initial_deposit_bank_id', $bankId);
            });
        }

        if ($request->filled('date_from')) {
            $query->whereDate('paid_date', '>=', $request->input('date_from'));
        }
        if ($request->filled('date_to')) {
            $query->whereDate('paid_date', '<=', $request->input('date_to'));
        }

        $expenses = $query->get();
        $totalExpenses = 0.0;
        $totalPaid = 0.0;
        $totalBalance = 0.0;

        foreach ($expenses as $expense) {
            $amount = (float) $expense->amount;
            $discount = (float) ($expense->discount_amount ?? 0);
            $gst = (float) ($expense->gst_amount ?? 0);
            $netTotal = max(0.0, $amount - $discount + $gst);
            $totalExpenses += $netTotal;

            $paid = self::calculateExpensePaid($expense);
            $totalPaid += $paid;
            $totalBalance += max(0.0, $netTotal - $paid);
        }

        $totalBalance = round($totalBalance, 2);
        $totalPaid = round($totalPaid, 2);
        $totalExpenses = round($totalExpenses, 2);

        return response()->json([
            'totalExpenses' => $totalExpenses,
            'totalExpense' => $totalExpenses, // backwards compatibility alias
            'totalValue' => $totalExpenses,
            'totalPaid' => $totalPaid,
            'totalBalance' => $totalBalance,
            'totalCount' => $expenses->count(),
        ]);
    }

    public function store(Request $request)
    {
        $request->merge([
            'paid_date' => $request->filled('paid_date') ? $request->input('paid_date') : null,
            'due_date' => $request->filled('due_date') ? $request->input('due_date') : null,
            'vendor_email' => $request->filled('vendor_email') ? $request->input('vendor_email') : null,
            'approval_date' => $request->filled('approval_date') ? $request->input('approval_date') : null,
        ]);

        $validated = $request->validate([
            'vendor' => 'required|string',
            'expense_type' => 'required|string',
            'amount' => 'required|numeric|min:0.01',
            'method' => 'nullable|string',
            'bank_account_id' => 'nullable|exists:bank_accounts,id',
            'paid_date' => 'nullable|date',
            'status' => 'nullable|string',
            'transaction_id' => 'nullable|string',
            'bill_no' => 'nullable|string',
            'project' => 'nullable|string',
            'category' => 'nullable|string',
            'currency' => 'nullable|string',
            'bank' => 'nullable|string',
            'gst_applied' => 'nullable|string',
            'gst_percent' => 'nullable|numeric',
            'gst_amount' => 'nullable|numeric',
            'net_amount' => 'nullable|numeric',
            'vendor_gstin' => 'nullable|string',
            'itc_eligible' => 'nullable|string',
            'staff' => 'nullable|string',
            'department' => 'nullable|string',
            'notes' => 'nullable|string',
            'description' => 'nullable|string',
            'location' => 'nullable|string',
            'reference_number' => 'nullable|string',
            'due_date' => 'nullable|date',
            'recurring' => 'nullable|string',
            'frequency' => 'nullable|string',
            'tax_category' => 'nullable|string',
            'approval_status' => 'nullable|string',
            'approved_by' => 'nullable|string',
            'approval_date' => 'nullable|date',
            'tags' => 'nullable|string',
            'priority' => 'nullable|string',
            'reimbursement_status' => 'nullable|string',
            'vendor_email' => 'nullable|string|email',
            'vendor_phone' => 'nullable|string',
            'discount_amount' => 'nullable|numeric',
            'initial_deposit_amount' => 'nullable|numeric',
            'initial_deposit_bank_id' => 'nullable|exists:bank_accounts,id',
            'extra_installments' => 'nullable|array',
            'extra_installments.*.date' => 'sometimes|nullable|date',
            'extra_installments.*.amount' => 'sometimes|nullable|numeric',
            'extra_installments.*.method' => 'sometimes|nullable|string',
            'extra_installments.*.bank_account_id' => 'sometimes|nullable|exists:bank_accounts,id',
            'extra_installments.*.bank_name' => 'sometimes|nullable|string',
            'extra_installments.*.status' => 'sometimes|nullable|string',
            'extra_installments.*.paid_date' => 'sometimes|nullable|date',
            'extra_installments.*.transaction_id' => 'sometimes|nullable|string',
            'extra_installments.*.note' => 'sometimes|nullable|string',
        ]);

        $method = $validated['method'] ?? 'Bank Account';
        $validated['method'] = $method;
        if ($method === 'Cash' && empty($validated['bank_account_id'])) {
            $validated['bank_account_id'] = null;
            $validated['initial_deposit_bank_id'] = null;
            $validated['bank'] = 'Cash';
        }

        $validated['gst_applied'] = $validated['gst_applied'] ?? 'No';
        $validated['recurring'] = $validated['recurring'] ?? 'No';
        $validated['currency'] = $validated['currency'] ?? 'INR';
        $validated['itc_eligible'] = $validated['itc_eligible'] ?? 'No';
        $validated['approval_status'] = $validated['approval_status'] ?? 'Pending';
        $validated['priority'] = $validated['priority'] ?? 'Medium';

        $fillable = (new Expense)->getFillable();
        $payload = array_intersect_key($validated, array_flip($fillable));

        if (empty($payload['bank_account_id']) && !empty($payload['initial_deposit_bank_id'])) {
            $payload['bank_account_id'] = $payload['initial_deposit_bank_id'];
        }
        if (empty($payload['bank']) && !empty($payload['bank_account_id'])) {
            $b = BankAccount::find($payload['bank_account_id']);
            if ($b) {
                $payload['bank'] = $b->bank_name;
            }
        }

        $amount = (float) $payload['amount'];
        $discount = isset($payload['discount_amount']) ? (float) $payload['discount_amount'] : 0.0;
        $gst = isset($payload['gst_amount']) ? (float) $payload['gst_amount'] : 0.0;
        $netTotal = max(0.0, $amount - $discount + $gst);
        $payload['net_amount'] = $netTotal;

        $isSplitRequest = (!empty($payload['extra_installments']) && is_array($payload['extra_installments']) && count($payload['extra_installments']) > 0)
            || ($request->input('payment_terms') === 'Split Payment');

        if (!$isSplitRequest) {
            $payload['initial_deposit_amount'] = $netTotal;
            $payload['initial_deposit_bank_id'] = $payload['bank_account_id'] ?? null;
            $payload['extra_installments'] = null;
        } else {
            if (!empty($payload['extra_installments']) && is_array($payload['extra_installments'])) {
                $normalizedExtra = [];
                foreach ($payload['extra_installments'] as $idx => $inst) {
                    $instAmt = isset($inst['amount']) && $inst['amount'] !== '' ? (float) $inst['amount'] : 0.0;
                    $st = strtolower(trim((string)($inst['status'] ?? '')));
                    $isPaid = in_array($st, ['paid', 'completed']) || (!empty($inst['is_paid']) && $st !== 'pending');
                    if ($isPaid && $instAmt > 0) {
                        $inst['status'] = 'Paid';
                        $inst['paid_date'] = !empty($inst['paid_date']) ? $inst['paid_date'] : (!empty($inst['date']) ? $inst['date'] : ($payload['paid_date'] ?? now()->toDateString()));
                        $inst['transaction_id'] = !empty($inst['transaction_id']) ? $inst['transaction_id'] : ('EXP-PAY-' . time() . '-' . ($idx + 1));
                    } else {
                        $inst['status'] = 'Pending';
                        $inst['paid_date'] = null;
                    }
                    $normalizedExtra[] = $inst;
                }
                $payload['extra_installments'] = $normalizedExtra;
            }
        }

        $initialDeposit = isset($payload['initial_deposit_amount']) ? (float) $payload['initial_deposit_amount'] : null;
        $initialDepositBankId = $payload['initial_deposit_bank_id'] ?? $payload['bank_account_id'] ?? null;
        $extraInstallments = $payload['extra_installments'] ?? [];

        // Financial validation
        $valError = FinancialValidator::validatePayments($netTotal, $initialDeposit, $initialDepositBankId, $extraInstallments, $method);
        if ($valError) {
            return $valError;
        }

        return DB::transaction(function () use ($payload, $netTotal) {
            // Instantiate model in memory to calculate status dynamically
            $temp = new Expense($payload);
            $paidAmount = self::calculateExpensePaid($temp);
            $payload['status'] = self::getExpenseStatus($netTotal, $paidAmount);

            $expense = Expense::create($payload);

            $paymentEntries = self::getPaymentEntries($expense);
            self::applyExpensePayments($expense, $paymentEntries);

            return response()->json($expense->load(['bankAccount', 'transactions']), 201);
        });
    }

    public function update(Request $request, $id)
    {
        return DB::transaction(function () use ($request, $id) {
            $expense = Expense::lockForUpdate()->findOrFail($id);
            if ($expense->invoice_id) {
                return response()->json(['message' => 'This expense record was created from an Invoice and cannot be edited here. Edit the Invoice instead.'], 403);
            }

            $validated = $request->validate([
                'vendor' => 'required|string',
                'expense_type' => 'required|string',
                'amount' => 'required|numeric|min:0.01',
                'method' => 'nullable|string',
                'bank_account_id' => 'nullable|exists:bank_accounts,id',
                'paid_date' => 'nullable|date',
                'status' => 'nullable|string',
                'transaction_id' => 'nullable|string',
                'bill_no' => 'nullable|string',
                'project' => 'nullable|string',
                'category' => 'nullable|string',
                'currency' => 'nullable|string',
                'bank' => 'nullable|string',
                'gst_applied' => 'nullable|string',
                'gst_percent' => 'nullable|numeric',
                'gst_amount' => 'nullable|numeric',
                'net_amount' => 'nullable|numeric',
                'vendor_gstin' => 'nullable|string',
                'itc_eligible' => 'nullable|string',
                'staff' => 'nullable|string',
                'department' => 'nullable|string',
                'notes' => 'nullable|string',
                'description' => 'nullable|string',
                'location' => 'nullable|string',
                'reference_number' => 'nullable|string',
                'due_date' => 'nullable|date',
                'recurring' => 'nullable|string',
                'frequency' => 'nullable|string',
                'tax_category' => 'nullable|string',
                'approval_status' => 'nullable|string',
                'approved_by' => 'nullable|string',
                'approval_date' => 'nullable|date',
                'tags' => 'nullable|string',
                'priority' => 'nullable|string',
                'reimbursement_status' => 'nullable|string',
                'vendor_email' => 'nullable|string|email',
                'vendor_phone' => 'nullable|string',
                'discount_amount' => 'nullable|numeric',
                'initial_deposit_amount' => 'nullable|numeric',
                'initial_deposit_bank_id' => 'nullable|exists:bank_accounts,id',
                'extra_installments' => 'nullable|array',
                'extra_installments.*.date' => 'sometimes|nullable|date',
                'extra_installments.*.amount' => 'sometimes|nullable|numeric',
                'extra_installments.*.method' => 'sometimes|nullable|string',
                'extra_installments.*.bank_account_id' => 'sometimes|nullable|exists:bank_accounts,id',
                'extra_installments.*.bank_name' => 'sometimes|nullable|string',
                'extra_installments.*.status' => 'sometimes|nullable|string',
                'extra_installments.*.paid_date' => 'sometimes|nullable|date',
                'extra_installments.*.transaction_id' => 'sometimes|nullable|string',
                'extra_installments.*.note' => 'sometimes|nullable|string',
            ]);

            // Determine if expense previously had payment activity
            $hasExistingPayments = (self::calculateExpensePaid($expense) > 0)
                || Transaction::where('related_id', $expense->id)->where('related_type', Expense::class)->exists()
                || ((float)($expense->initial_deposit_amount ?? 0) > 0);

            if (!$hasExistingPayments && !empty($expense->extra_installments) && is_array($expense->extra_installments)) {
                foreach ($expense->extra_installments as $inst) {
                    $st = strtolower(trim((string)($inst['status'] ?? '')));
                    if (in_array($st, ['paid', 'completed']) || !empty($inst['is_paid'])) {
                        $hasExistingPayments = true;
                        break;
                    }
                }
            }

            $wasSplit = (!empty($expense->extra_installments) && is_array($expense->extra_installments) && count($expense->extra_installments) > 0);

            $isSplitRequest = (!empty($validated['extra_installments']) && is_array($validated['extra_installments']) && count($validated['extra_installments']) > 0)
                || ($request->input('payment_terms') === 'Split Payment');

            // Lock the selected Single Payment or Split Payment structure once payment activity exists
            if ($hasExistingPayments) {
                if ($wasSplit && !$isSplitRequest) {
                    return response()->json([
                        'message' => 'Payment structure is locked because payment activity exists. You cannot switch from Split Payment to Single Payment.'
                    ], 422);
                }
                if (!$wasSplit && $isSplitRequest) {
                    return response()->json([
                        'message' => 'Payment structure is locked because payment activity exists. You cannot switch from Single Payment to Split Payment.'
                    ], 422);
                }
            }

            $method = $validated['method'] ?? $expense->method ?? 'Bank Account';
            $validated['method'] = $method;
            if ($method === 'Cash' && empty($validated['bank_account_id'])) {
                $validated['bank_account_id'] = null;
                $validated['initial_deposit_bank_id'] = null;
                $validated['bank'] = 'Cash';
            }

            if (empty($validated['bank_account_id']) && !empty($validated['initial_deposit_bank_id'])) {
                $validated['bank_account_id'] = $validated['initial_deposit_bank_id'];
            }
            if (empty($validated['bank']) && !empty($validated['bank_account_id'])) {
                $b = BankAccount::find($validated['bank_account_id']);
                if ($b) {
                    $validated['bank'] = $b->bank_name;
                }
            }

            $validated['currency'] = $validated['currency'] ?? $expense->currency ?? 'INR';
            $validated['gst_applied'] = $validated['gst_applied'] ?? $expense->gst_applied ?? 'No';
            $validated['recurring'] = $validated['recurring'] ?? $expense->recurring ?? 'No';
            $validated['itc_eligible'] = $validated['itc_eligible'] ?? $expense->itc_eligible ?? 'No';
            $validated['approval_status'] = $validated['approval_status'] ?? $expense->approval_status ?? 'Pending';
            $validated['priority'] = $validated['priority'] ?? $expense->priority ?? 'Medium';

            $amount = (float) $validated['amount'];
            $discount = isset($validated['discount_amount']) ? (float) $validated['discount_amount'] : 0.0;
            $gst = isset($validated['gst_amount']) ? (float) $validated['gst_amount'] : 0.0;
            $netTotal = max(0.0, $amount - $discount + $gst);
            $validated['net_amount'] = $netTotal;

            if (!$isSplitRequest) {
                // Single Payment: Amount Paid is automatically equal to Total Value ($netTotal)
                $validated['initial_deposit_amount'] = $netTotal;
                $validated['initial_deposit_bank_id'] = $validated['bank_account_id'] ?? null;
                $validated['extra_installments'] = null;
            } else {
                if (!empty($validated['extra_installments']) && is_array($validated['extra_installments'])) {
                    $normalizedExtra = [];
                    foreach ($validated['extra_installments'] as $idx => $inst) {
                        $instAmt = isset($inst['amount']) && $inst['amount'] !== '' ? (float) $inst['amount'] : 0.0;
                        $st = strtolower(trim((string)($inst['status'] ?? '')));
                        $isPaid = in_array($st, ['paid', 'completed']) || (!empty($inst['is_paid']) && $st !== 'pending');
                        if ($isPaid && $instAmt > 0) {
                            $inst['status'] = 'Paid';
                            $inst['paid_date'] = !empty($inst['paid_date']) ? $inst['paid_date'] : (!empty($inst['date']) ? $inst['date'] : ($expense->paid_date ?: now()->toDateString()));
                            $inst['transaction_id'] = !empty($inst['transaction_id']) ? $inst['transaction_id'] : ($expense->transaction_id ?: ('EXP-PAY-' . $expense->id . '-' . ($idx + 1)));
                        } else {
                            $inst['status'] = 'Pending';
                            $inst['paid_date'] = null;
                        }
                        $normalizedExtra[] = $inst;
                    }
                    $validated['extra_installments'] = $normalizedExtra;
                }
            }

            $initialDeposit = isset($validated['initial_deposit_amount']) ? (float) $validated['initial_deposit_amount'] : null;
            $initialDepositBankId = $validated['initial_deposit_bank_id'] ?? $validated['bank_account_id'] ?? null;
            $extraInstallments = $validated['extra_installments'] ?? [];

            // Perform financial validation first to avoid premature state changes
            $valError = FinancialValidator::validatePayments($netTotal, $initialDeposit, $initialDepositBankId, $extraInstallments, $method);
            if ($valError) {
                return $valError;
            }

            if (!$isSplitRequest) {
                // === SINGLE PAYMENT UPDATE ===
                $existingTxs = Transaction::where('related_id', $expense->id)
                    ->where('related_type', Expense::class)
                    ->orderBy('id', 'asc')
                    ->get();

                if ($existingTxs->isEmpty()) {
                    $existingTxs = $expense->resolveTransactions();
                }

                $primaryTx = $existingTxs->first();
                $newBankId = $validated['bank_account_id'] ?? null;
                $newBank = $newBankId ? BankAccount::lockForUpdate()->find($newBankId) : null;
                $date = !empty($validated['paid_date']) ? $validated['paid_date'] : ($expense->paid_date ?: now()->toDateString());
                $refId = $validated['transaction_id'] ?? $expense->transaction_id;
                $notes = LedgerService::generateExpenseDescription($validated['vendor'], $validated['expense_type']);

                if ($primaryTx) {
                    $oldAmount = (float) $primaryTx->amount;
                    $oldBankId = $primaryTx->bank_account_id;

                    // Clean up any duplicate transactions if they exist from past operations
                    if ($existingTxs->count() > 1) {
                        for ($i = 1; $i < $existingTxs->count(); $i++) {
                            $dup = $existingTxs[$i];
                            if ($dup->bank_account_id) {
                                $dupBank = BankAccount::lockForUpdate()->find($dup->bank_account_id);
                                if ($dupBank) {
                                    $dupBank->current_balance = round((float) $dupBank->current_balance + (float) $dup->amount, 2);
                                    $dupBank->save();
                                }
                            }
                            $dup->delete();
                        }
                    }

                    // Adjust bank balance by the difference for expenses (Debit means subtract)
                    if ($oldBankId && $newBankId && (int)$oldBankId === (int)$newBankId) {
                        // Same bank account: adjust only by the difference
                        $diff = round($netTotal - $oldAmount, 2);
                        if ($diff != 0 && $newBank) {
                            $newBank->current_balance = round((float) $newBank->current_balance - $diff, 2);
                            $newBank->save();
                        }
                    } else {
                        // Bank account changed: refund old bank, debit new bank
                        if ($oldBankId) {
                            $oldBank = BankAccount::lockForUpdate()->find($oldBankId);
                            if ($oldBank) {
                                $oldBank->current_balance = round((float) $oldBank->current_balance + $oldAmount, 2);
                                $oldBank->save();
                            }
                        }
                        if ($newBank) {
                            $newBank->current_balance = round((float) $newBank->current_balance - $netTotal, 2);
                            $newBank->save();
                        }
                    }

                    // Update existing transaction in place
                    $primaryTx->update([
                        'date' => $date,
                        'amount' => $netTotal,
                        'currency' => $validated['currency'] ?? ($expense->currency ?? 'INR'),
                        'category' => $validated['category'] ?? $expense->category,
                        'method' => $method,
                        'bank' => $newBank ? ($newBank->bank_name ?? $newBank->nick_name) : ($method === 'Cash' ? 'Cash' : null),
                        'bank_account_id' => $newBankId,
                        'reference_id' => $refId,
                        'description' => $notes,
                        'status' => 'Completed',
                    ]);
                } else {
                    // No existing transaction found: debit bank and create transaction
                    if ($netTotal > 0) {
                        if ($newBank) {
                            $newBank->current_balance = round((float) $newBank->current_balance - $netTotal, 2);
                            $newBank->save();
                        }
                        Transaction::create([
                            'type' => 'Expense',
                            'date' => $date,
                            'amount' => $netTotal,
                            'currency' => $validated['currency'] ?? ($expense->currency ?? 'INR'),
                            'category' => $validated['category'] ?? $expense->category,
                            'method' => $method,
                            'bank' => $newBank ? ($newBank->bank_name ?? $newBank->nick_name) : ($method === 'Cash' ? 'Cash' : null),
                            'bank_account_id' => $newBankId,
                            'reference_id' => $refId,
                            'description' => $notes,
                            'status' => 'Completed',
                            'related_id' => $expense->id,
                            'related_type' => Expense::class,
                        ]);
                    }
                }

                $expense->fill($validated);
                $paidAmount = self::calculateExpensePaid($expense);
                $expense->status = self::getExpenseStatus($netTotal, $paidAmount);
                $expense->save();

                return response()->json($expense->load(['bankAccount', 'transactions']));
            } else {
                // === SPLIT PAYMENT UPDATE ===
                $existingTxs = Transaction::where('related_id', $expense->id)
                    ->where('related_type', Expense::class)
                    ->get();

                if ($existingTxs->isEmpty()) {
                    $existingTxs = $expense->resolveTransactions();
                }

                $unmatchedTxs = $existingTxs->keyBy('id');
                $updatedExtra = [];

                foreach ($extraInstallments as $idx => $inst) {
                    $status = strtolower(trim((string)($inst['status'] ?? '')));
                    $instAmt = (float) ($inst['amount'] ?? 0);
                    $isPaid = in_array($status, ['paid', 'completed']) || (!empty($inst['is_paid']) && $status !== 'pending');
                    if ($isPaid && $instAmt > 0) {
                        $inst['status'] = 'Paid';
                    } else {
                        $inst['status'] = 'Pending';
                        $inst['paid_date'] = null;
                    }
                    $instMethod = $inst['method'] ?? 'Bank Account';
                    $instBankId = $inst['bank_account_id'] ?? null;
                    $instTxRef = !empty($inst['transaction_id']) ? $inst['transaction_id'] : ($expense->transaction_id ?: ('EXP-PAY-' . $expense->id . '-' . ($idx + 1)));
                    $instDate = !empty($inst['paid_date']) ? $inst['paid_date'] : (!empty($inst['date']) ? $inst['date'] : ($expense->paid_date ?: now()->toDateString()));
                    $instNote = LedgerService::generateMilestoneDescription($idx + 1, $validated['vendor'] ?? $expense->vendor, $validated['expense_type'] ?? $expense->expense_type, $inst['note'] ?? null);

                    $bank = $instBankId ? BankAccount::lockForUpdate()->find($instBankId) : null;
                    $inst['bank_name'] = $bank ? ($bank->bank_name . ' - ' . $bank->account_number) : '';
                    $inst['transaction_id'] = $instTxRef;
                    $inst['paid_date'] = $instDate;

                    if ($isPaid && $instAmt > 0) {
                        $matchedTx = null;
                        foreach ($unmatchedTxs as $tId => $txItem) {
                            if ($txItem->reference_id === $instTxRef) {
                                $matchedTx = $txItem;
                                unset($unmatchedTxs[$tId]);
                                break;
                            }
                        }
                        if (!$matchedTx && $unmatchedTxs->isNotEmpty()) {
                            $matchedTx = $unmatchedTxs->shift();
                        }

                        if ($matchedTx) {
                            $oldAmt = (float) $matchedTx->amount;
                            $oldBankId = $matchedTx->bank_account_id;

                            if ($oldBankId && $instBankId && (int)$oldBankId === (int)$instBankId) {
                                $diff = round($instAmt - $oldAmt, 2);
                                if ($diff != 0 && $bank) {
                                    $bank->current_balance = round((float) $bank->current_balance - $diff, 2);
                                    $bank->save();
                                }
                            } else {
                                if ($oldBankId) {
                                    $oldBank = BankAccount::lockForUpdate()->find($oldBankId);
                                    if ($oldBank) {
                                        $oldBank->current_balance = round((float) $oldBank->current_balance + $oldAmt, 2);
                                        $oldBank->save();
                                    }
                                }
                                if ($bank) {
                                    $bank->current_balance = round((float) $bank->current_balance - $instAmt, 2);
                                    $bank->save();
                                }
                            }

                            $matchedTx->update([
                                'date' => $instDate,
                                'amount' => $instAmt,
                                'currency' => $expense->currency ?? 'INR',
                                'category' => $expense->category,
                                'method' => $instMethod,
                                'bank' => $bank ? ($bank->bank_name ?? $bank->nick_name) : ($instMethod === 'Cash' ? 'Cash' : null),
                                'bank_account_id' => $instBankId,
                                'reference_id' => $instTxRef,
                                'description' => $instNote,
                                'status' => 'Completed',
                            ]);
                        } else {
                            // Create new transaction for this milestone
                            if ($bank) {
                                $bank->current_balance = round((float) $bank->current_balance - $instAmt, 2);
                                $bank->save();
                            }
                            Transaction::create([
                                'type' => 'Expense',
                                'date' => $instDate,
                                'amount' => $instAmt,
                                'currency' => $expense->currency ?? 'INR',
                                'category' => $expense->category,
                                'method' => $instMethod,
                                'bank' => $bank ? ($bank->bank_name ?? $bank->nick_name) : ($instMethod === 'Cash' ? 'Cash' : null),
                                'bank_account_id' => $instBankId,
                                'reference_id' => $instTxRef,
                                'description' => $instNote,
                                'status' => 'Completed',
                                'related_id' => $expense->id,
                                'related_type' => Expense::class,
                            ]);
                        }
                    }

                    $updatedExtra[] = $inst;
                }

                // Delete any remaining unmatched transactions and refund old bank
                foreach ($unmatchedTxs as $unusedTx) {
                    if ($unusedTx->bank_account_id) {
                        $oldBank = BankAccount::lockForUpdate()->find($unusedTx->bank_account_id);
                        if ($oldBank) {
                            $oldBank->current_balance = round((float) $oldBank->current_balance + (float) $unusedTx->amount, 2);
                            $oldBank->save();
                        }
                    }
                    $unusedTx->delete();
                }

                $validated['extra_installments'] = $updatedExtra;
                $expense->fill($validated);
                $paidAmount = self::calculateExpensePaid($expense);
                $expense->status = self::getExpenseStatus($netTotal, $paidAmount);
                $expense->save();

                return response()->json($expense->load(['bankAccount', 'transactions']));
            }
        });
    }

    /**
     * Record payment against an expense or a specific milestone.
     * POST /expenses/{id}/record-payment
     */
    public function recordPayment(Request $request, $id)
    {
        return DB::transaction(function () use ($request, $id) {
            $expense = Expense::lockForUpdate()->findOrFail($id);
            if ($expense->invoice_id) {
                return response()->json(['message' => 'Invoice linked expense payments must be managed via Invoice module.'], 403);
            }

            $validated = $request->validate([
                'amount' => 'required|numeric|min:0.01',
                'method' => 'nullable|string',
                'bank_account_id' => 'required|exists:bank_accounts,id',
                'payment_date' => 'nullable|date',
                'installment_index' => 'nullable|integer',
                'transaction_id' => 'nullable|string',
                'note' => 'nullable|string',
            ]);

            $paymentDate = !empty($validated['payment_date']) ? $validated['payment_date'] : now()->toDateString();
            $method = !empty($validated['method']) ? $validated['method'] : 'Bank Account';
            $bankAccountId = (int) $validated['bank_account_id'];
            $paymentAmount = (float) $validated['amount'];
            $txnRef = !empty($validated['transaction_id']) ? $validated['transaction_id'] : ('EXP-PAY-' . time() . '-' . rand(100, 999));
            $note = $validated['note'] ?? '';

            $bank = BankAccount::find($bankAccountId);
            $bankName = $bank ? ($bank->bank_name . ' - ' . $bank->account_number) : '';

            $netTotal = max(0.0, (float)$expense->amount - (float)($expense->discount_amount ?? 0) + (float)($expense->gst_amount ?? 0));
            $currentPaid = self::calculateExpensePaid($expense);
            $outstanding = max(0.0, $netTotal - $currentPaid);

            // Milestone-based payment
            if (isset($validated['installment_index']) && $validated['installment_index'] !== null) {
                $idx = (int) $validated['installment_index'];
                $extra = $expense->extra_installments ?? [];

                if (!isset($extra[$idx])) {
                    return response()->json(['message' => 'Milestone not found at index ' . $idx], 404);
                }

                $status = strtolower(trim((string)($extra[$idx]['status'] ?? '')));
                if (in_array($status, ['paid', 'completed'])) {
                    return response()->json(['message' => 'This milestone payment has already been recorded.'], 422);
                }

                $milestoneAmt = (float) ($extra[$idx]['amount'] ?? $paymentAmount);
                if ($milestoneAmt > $outstanding + 0.01) {
                    return response()->json(['message' => "Payment amount exceeds remaining balance of ₹" . number_format($outstanding, 2)], 422);
                }

                $extra[$idx]['status'] = 'Paid';
                $extra[$idx]['paid_date'] = $paymentDate;
                $extra[$idx]['method'] = $method;
                $extra[$idx]['bank_account_id'] = $bankAccountId;
                $extra[$idx]['bank_name'] = $bankName;
                $extra[$idx]['transaction_id'] = $txnRef;
                if ($note) {
                    $extra[$idx]['note'] = $note;
                }

                $expense->extra_installments = $extra;

                // Debit selected bank account
                if ($bank) {
                    $bank->current_balance = round((float)($bank->current_balance ?? 0) - $milestoneAmt, 2);
                    $bank->save();
                }

                // Create transaction
                Transaction::create([
                    'type' => 'Expense',
                    'date' => $paymentDate,
                    'amount' => $milestoneAmt,
                    'currency' => $expense->currency ?? 'INR',
                    'category' => $expense->category,
                    'method' => $method,
                    'bank' => $bank ? ($bank->bank_name ?? $bank->nick_name) : 'Bank Account',
                    'bank_account_id' => $bank ? $bank->id : null,
                    'reference_id' => $txnRef,
                    'description' => $note ?: LedgerService::generateMilestoneDescription($idx + 1, $expense->vendor, $expense->expense_type),
                    'status' => 'Completed',
                    'related_id' => $expense->id,
                    'related_type' => Expense::class,
                ]);
            } else {
                // Single payment
                if ($paymentAmount > $outstanding + 0.01) {
                    return response()->json(['message' => "Payment amount exceeds remaining balance of ₹" . number_format($outstanding, 2)], 422);
                }

                $expense->initial_deposit_amount = round((float)($expense->initial_deposit_amount ?? 0) + $paymentAmount, 2);
                $expense->method = $method;
                $expense->paid_date = $paymentDate;
                if ($bankAccountId) {
                    $expense->bank_account_id = $bankAccountId;
                    $expense->initial_deposit_bank_id = $bankAccountId;
                    $expense->bank = $bank ? $bank->bank_name : $expense->bank;
                }
                if ($txnRef) {
                    $expense->transaction_id = $txnRef;
                }

                // Debit selected bank account
                if ($bank) {
                    $bank->current_balance = round((float)($bank->current_balance ?? 0) - $paymentAmount, 2);
                    $bank->save();
                }

                // Create transaction
                Transaction::create([
                    'type' => 'Expense',
                    'date' => $paymentDate,
                    'amount' => $paymentAmount,
                    'currency' => $expense->currency ?? 'INR',
                    'category' => $expense->category,
                    'method' => $method,
                    'bank' => $bank ? ($bank->bank_name ?? $bank->nick_name) : 'Bank Account',
                    'bank_account_id' => $bank ? $bank->id : null,
                    'reference_id' => $txnRef,
                    'description' => $note ?: LedgerService::generateExpenseDescription($expense->vendor, $expense->expense_type),
                    'status' => 'Completed',
                    'related_id' => $expense->id,
                    'related_type' => Expense::class,
                ]);
            }

            $newPaid = self::calculateExpensePaid($expense);
            $expense->status = self::getExpenseStatus($netTotal, $newPaid);
            $expense->save();

            return response()->json($expense->load('bankAccount'));
        });
    }

    public function destroy($id)
    {
        return DB::transaction(function () use ($id) {
            $expense = Expense::lockForUpdate()->findOrFail($id);
            if ($expense->invoice_id) {
                return response()->json(['message' => 'This expense record was created from an Invoice and cannot be deleted here. Delete or edit the Invoice instead.'], 403);
            }

            self::reverseExpensePayments($expense);
            $expense->delete();
            return response()->json(null, 204);
        });
    }
}
