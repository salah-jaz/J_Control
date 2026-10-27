<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Income;
use App\Models\BankAccount;
use App\Models\Transaction;
use App\Models\Expense;
use App\Helpers\FinancialValidator;

class IncomeController extends Controller
{
    /**
     * Calculate actual paid amount for an income record based on recorded payments.
     * Unpaid milestones or pending incomes are NOT counted as received.
     */
    public static function calculateIncomePaid(Income $income): float
    {
        $amount = (float) $income->amount;
        $discount = (float) ($income->discount_amount ?? 0);
        $gst = (float) ($income->gst_amount ?? 0);
        $netTotal = max(0.0, $amount - $discount + $gst);

        // 1. If split payment with milestones
        if (!empty($income->extra_installments) && is_array($income->extra_installments)) {
            $paid = 0.0;
            foreach ($income->extra_installments as $inst) {
                $status = strtolower(trim((string)($inst['status'] ?? '')));
                if (in_array($status, ['paid', 'received', 'completed']) || !empty($inst['is_paid'])) {
                    $paid += (float) ($inst['amount'] ?? 0);
                }
            }
            return min($netTotal, round($paid, 2));
        }

        // 2. Single payment: deposit recorded
        if ($income->initial_deposit_amount !== null && (float) $income->initial_deposit_amount > 0) {
            return min($netTotal, round((float) $income->initial_deposit_amount, 2));
        }

        // 3. Fallback: check related transactions directly in the transactions table
        $txSum = Transaction::where('related_id', $income->id)
            ->where('related_type', Income::class)
            ->sum('amount');
        if ($txSum > 0) {
            return min($netTotal, round((float) $txSum, 2));
        }

        // 4. Fallback for Bank Opening Balance or legacy records where status was explicitly set
        $status = strtolower(trim((string) $income->status));
        if ($income->source === 'Opening Balance' || in_array($status, ['received', 'fully paid', 'paid', 'cleared'])) {
            return $netTotal;
        }

        return 0.0;
    }

    /**
     * Get dynamic status from total vs paid:
     * - Pending: No payment received (paid <= 0)
     * - Partially Paid: Some payment received, outstanding balance remains (0 < paid < total)
     * - Fully Paid: Complete payable amount received (paid >= total)
     */
    public static function getIncomeStatus(float $totalAmount, float $paidAmount): string
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
     * Build list of payments (amount, method, bank_account_id, date, reference_id, note)
     * for actual paid payments only.
     */
    private static function getPaymentEntries(Income $income): array
    {
        $entries = [];
        $baseDate = $income->received_date ?: now()->toDateString();

        // Split payments
        if (!empty($income->extra_installments) && is_array($income->extra_installments)) {
            foreach ($income->extra_installments as $idx => $inst) {
                $status = strtolower(trim((string)($inst['status'] ?? '')));
                $amt = (float) ($inst['amount'] ?? 0);
                $isPaid = ($amt > 0) || in_array($status, ['paid', 'received', 'completed']) || !empty($inst['is_paid']);
                if ($isPaid && $amt > 0) {
                    $method = !empty($inst['method']) ? $inst['method'] : 'Bank Account';
                    $bankId = isset($inst['bank_account_id']) ? (int) $inst['bank_account_id'] : null;
                    $ref = !empty($inst['transaction_id']) ? $inst['transaction_id'] : ('PAY-' . $income->id . '-' . ($idx + 1));
                    $desc = \App\Services\LedgerService::generateSourceBasedDescription(
                        $income->source,
                        $income->client,
                        $ref,
                        $income->category,
                        !empty($inst['note']) ? $inst['note'] : $income->notes
                    );
                    $entries[] = [
                        'amount' => $amt,
                        'method' => $method,
                        'bank_account_id' => $bankId,
                        'date' => !empty($inst['paid_date']) ? $inst['paid_date'] : (!empty($inst['date']) ? $inst['date'] : $baseDate),
                        'reference_id' => $ref,
                        'description' => $desc,
                    ];
                }
            }
            return $entries;
        }

        // Single payment
        $deposit = (float) ($income->initial_deposit_amount ?? 0);
        if ($deposit > 0) {
            $method = $income->method ?: 'Bank Account';
            $bankId = $income->bank_account_id ?: $income->initial_deposit_bank_id;
            $ref = $income->transaction_id ?: ($income->reference_number ?: $income->invoice_no);
            $desc = \App\Services\LedgerService::generateSourceBasedDescription(
                $income->source,
                $income->client,
                $ref,
                $income->category,
                $income->notes
            );
            $entries[] = [
                'amount' => $deposit,
                'method' => $method,
                'bank_account_id' => $bankId,
                'date' => $baseDate,
                'reference_id' => $ref,
                'description' => $desc,
            ];
        }

        return $entries;
    }

    /**
     * Create transactions and credit bank balances for given payment entries.
     */
    private static function applyIncomePayments(Income $income, array $paymentEntries): void
    {
        foreach ($paymentEntries as $entry) {
            $bank = null;
            $method = $entry['method'] ?? $income->method ?? 'Bank Account';
            $bankId = $entry['bank_account_id'] ?? null;

            if ($bankId) {
                $bank = BankAccount::find($bankId);
                if ($bank) {
                    $bank->current_balance = round((float) ($bank->current_balance ?? 0) + $entry['amount'], 2);
                    $bank->save();
                }
            }

            Transaction::create([
                'type' => 'Income',
                'date' => $entry['date'],
                'amount' => $entry['amount'],
                'currency' => $income->currency ?? 'INR',
                'category' => $income->category,
                'method' => $method,
                'bank' => $bank ? ($bank->bank_name ?? $bank->nick_name) : ($method === 'Cash' ? 'Cash' : null),
                'bank_account_id' => $bank ? $bank->id : null,
                'reference_id' => $entry['reference_id'] ?? $income->transaction_id,
                'description' => $entry['description'] ?? ($income->description ?: ($income->notes ?: "Income from {$income->client}")),
                'status' => 'Received',
                'related_id' => $income->id,
                'related_type' => Income::class,
            ]);
        }
    }

    /**
     * Reverse transactions and debit bank balances for an income (by its related transactions).
     */
    private static function reverseIncomePayments(Income $income): void
    {
        $transactions = Transaction::where('related_id', $income->id)
            ->where('related_type', Income::class)
            ->get();

        foreach ($transactions as $tx) {
            if ($tx->bank_account_id) {
                $bank = BankAccount::find($tx->bank_account_id);
                if ($bank) {
                    $bank->current_balance = round((float) ($bank->current_balance ?? 0) - (float) $tx->amount, 2);
                    $bank->save();
                }
            }
            $tx->delete();
        }
    }

    /**
     * List incomes with optional filters and pagination.
     * Query params: search, status, category, bank_account_id, date_from, date_to, page, per_page
     */
    public function index(Request $request)
    {
        BankAccount::ensureDefaultCashAccount();
        $query = Income::with(['bankAccount', 'transactions'])->latest('id');

        if ($request->filled('search')) {
            $term = '%' . $request->input('search') . '%';
            $query->where(function ($q) use ($term) {
                $q->where('client', 'like', $term)
                    ->orWhere('source', 'like', $term)
                    ->orWhere('invoice_no', 'like', $term)
                    ->orWhere('notes', 'like', $term);
            });
        }

        if ($request->filled('status') && strtolower($request->input('status')) !== 'all') {
            $status = $request->input('status');
            if (in_array($status, ['Paid', 'Received', 'Fully Paid'])) {
                $query->whereIn('status', ['Received', 'Fully Paid', 'Paid']);
            } elseif (in_array($status, ['Partial', 'Partially Received', 'Partially Paid'])) {
                $query->whereIn('status', ['Partially Received', 'Partially Paid']);
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
            $query->whereDate('received_date', '>=', $request->input('date_from'));
        }
        if ($request->filled('date_to')) {
            $query->whereDate('received_date', '<=', $request->input('date_to'));
        }

        $perPage = max(1, min(100, (int) $request->input('per_page', 20)));
        $paginator = $query->paginate($perPage);
        $paginator->getCollection()->transform(function ($income) {
            if ($income->transactions->isEmpty()) {
                $resolved = $income->resolveTransactions();
                if ($resolved->isNotEmpty()) {
                    $income->setRelation('transactions', $resolved);
                }
            }
            return $income;
        });
        return $paginator;
    }

    public function show($id)
    {
        $income = Income::with(['bankAccount', 'transactions'])->findOrFail($id);
        if ($income->transactions->isEmpty()) {
            $resolved = $income->resolveTransactions();
            if ($resolved->isNotEmpty()) {
                $income->setRelation('transactions', $resolved);
            }
        }
        return response()->json($income);
    }

    /**
     * GET /incomes/summary - aggregates matching financial records.
     * Total Value: Received (Credit) - Debit
     * Received (Credit): Actual received credits (no double counting, no unpaid amounts)
     * Debit: Total expenses/debits
     * Outstanding: Total unpaid amount across incomes
     * Total Incomes: Count of income records
     */
    public function summary(Request $request)
    {
        $query = Income::query();

        if ($request->filled('search')) {
            $term = '%' . $request->input('search') . '%';
            $query->where(function ($q) use ($term) {
                $q->where('client', 'like', $term)
                    ->orWhere('source', 'like', $term)
                    ->orWhere('invoice_no', 'like', $term)
                    ->orWhere('notes', 'like', $term);
            });
        }

        if ($request->filled('status') && strtolower($request->input('status')) !== 'all') {
            $status = $request->input('status');
            if (in_array($status, ['Paid', 'Received', 'Fully Paid'])) {
                $query->whereIn('status', ['Received', 'Fully Paid', 'Paid']);
            } elseif (in_array($status, ['Partial', 'Partially Received', 'Partially Paid'])) {
                $query->whereIn('status', ['Partially Received', 'Partially Paid']);
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
            $query->whereDate('received_date', '>=', $request->input('date_from'));
        }
        if ($request->filled('date_to')) {
            $query->whereDate('received_date', '<=', $request->input('date_to'));
        }

        $incomes = $query->get();
        $totalIncome = 0.0;
        $totalReceived = 0.0;
        $totalBalance = 0.0;

        foreach ($incomes as $income) {
            $amount = (float) $income->amount;
            $discount = (float) ($income->discount_amount ?? 0);
            $gst = (float) ($income->gst_amount ?? 0);
            $netTotal = max(0.0, $amount - $discount + $gst);
            $totalIncome += $netTotal;

            $paid = self::calculateIncomePaid($income);
            $totalReceived += $paid;
            $totalBalance += max(0.0, $netTotal - $paid);
        }

        $totalBalance = round($totalBalance, 2);
        $totalReceived = round($totalReceived, 2);
        $totalIncome = round($totalIncome, 2);

        // Calculate total debit from expenses
        $expenseQuery = Expense::query();

        if ($request->filled('bank_account_id')) {
            $bankId = $request->input('bank_account_id');
            $expenseQuery->where(function ($q) use ($bankId) {
                $q->where('bank_account_id', $bankId)
                  ->orWhere('initial_deposit_bank_id', $bankId);
            });
        }

        if ($request->filled('date_from')) {
            $expenseQuery->whereDate('paid_date', '>=', $request->input('date_from'));
        }
        if ($request->filled('date_to')) {
            $expenseQuery->whereDate('paid_date', '<=', $request->input('date_to'));
        }

        $expenses = $expenseQuery->get();
        $totalDebit = 0.0;
        foreach ($expenses as $expense) {
            $eAmount = (float) $expense->amount;
            $eDiscount = (float) ($expense->discount_amount ?? 0);
            $eGst = (float) ($expense->gst_amount ?? 0);
            $eNetTotal = max(0.0, $eAmount - $eDiscount + $eGst);
            $totalDebit += $eNetTotal;
        }

        $totalDebit = round($totalDebit, 2);
        $totalValue = round($totalReceived - $totalDebit, 2);

        return response()->json([
            'totalIncome' => $totalIncome,
            'totalReceived' => $totalReceived,
            'totalDebit' => $totalDebit,
            'totalValue' => $totalValue,
            'totalBalance' => $totalBalance,
            'totalCount' => $incomes->count(),
        ]);
    }

    public function store(Request $request)
    {
        $request->merge([
            'client_email' => $request->filled('client_email') ? $request->input('client_email') : null,
            'invoice_date' => $request->filled('invoice_date') ? $request->input('invoice_date') : null,
            'due_date' => $request->filled('due_date') ? $request->input('due_date') : null,
            'received_date' => $request->filled('received_date') ? $request->input('received_date') : null,
            'follow_up_date' => $request->filled('follow_up_date') ? $request->input('follow_up_date') : null,
        ]);

        $validated = $request->validate([
            'client' => 'required|string',
            'source' => 'required|string',
            'amount' => 'required|numeric|min:0.01',
            'method' => 'nullable|string',
            'bank_account_id' => 'nullable|exists:bank_accounts,id',
            'received_date' => 'nullable|date',
            'status' => 'nullable|string',
            'transaction_id' => 'nullable|string',
            'invoice_no' => 'nullable|string',
            'project' => 'nullable|string',
            'category' => 'nullable|string',
            'currency' => 'nullable|string',
            'bank' => 'nullable|string',
            'gst_applied' => 'nullable|string',
            'gst_percent' => 'nullable|numeric',
            'gst_amount' => 'nullable|numeric',
            'net_amount' => 'nullable|numeric',
            'staff' => 'nullable|string',
            'department' => 'nullable|string',
            'notes' => 'nullable|string',
            'description' => 'nullable|string',
            'reference_number' => 'nullable|string',
            'invoice_date' => 'nullable|date',
            'due_date' => 'nullable|date',
            'recurring' => 'nullable|string',
            'frequency' => 'nullable|string',
            'client_email' => 'nullable|string|email',
            'client_phone' => 'nullable|string',
            'payment_terms' => 'nullable|string',
            'discount_applied' => 'nullable|string',
            'discount_amount' => 'nullable|numeric',
            'late_fee' => 'nullable|numeric',
            'collection_status' => 'nullable|string',
            'follow_up_date' => 'nullable|date',
            'commission' => 'nullable|numeric',
            'tax_category' => 'nullable|string',
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
        $validated['discount_applied'] = $validated['discount_applied'] ?? 'No';
        $validated['recurring'] = $validated['recurring'] ?? 'No';

        $fillable = (new Income)->getFillable();
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
            $payload['payment_terms'] = 'Single Payment';
        } else {
            $payload['payment_terms'] = 'Split Payment';
            if (!empty($payload['extra_installments']) && is_array($payload['extra_installments'])) {
                $normalizedExtra = [];
                foreach ($payload['extra_installments'] as $idx => $inst) {
                    $instAmt = isset($inst['amount']) && $inst['amount'] !== '' ? (float) $inst['amount'] : 0.0;
                    if ($instAmt > 0) {
                        $inst['status'] = 'Paid';
                        $inst['paid_date'] = !empty($inst['paid_date']) ? $inst['paid_date'] : (!empty($inst['date']) ? $inst['date'] : ($payload['received_date'] ?? now()->toDateString()));
                        $inst['transaction_id'] = !empty($inst['transaction_id']) ? $inst['transaction_id'] : ('PAY-' . time() . '-' . ($idx + 1));
                    } else {
                        $inst['status'] = 'Pending';
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
            $temp = new Income($payload);
            $paidAmount = self::calculateIncomePaid($temp);
            $payload['status'] = self::getIncomeStatus($netTotal, $paidAmount);

            $income = Income::create($payload);

            $paymentEntries = self::getPaymentEntries($income);
            self::applyIncomePayments($income, $paymentEntries);

            return response()->json($income->load('bankAccount'), 201);
        });
    }

    public function update(Request $request, $id)
    {
        return DB::transaction(function () use ($request, $id) {
            $income = Income::lockForUpdate()->findOrFail($id);
            if ($income->invoice_id) {
                return response()->json(['message' => 'This income record was created from an Invoice and cannot be edited here. Edit the Invoice instead.'], 403);
            }
            if ($income->inv_id) {
                return response()->json(['message' => 'This income record was created from an INV and cannot be edited here. Edit the INV instead.'], 403);
            }
            if ($income->source === 'Opening Balance' || ($income->reference_number && str_starts_with($income->reference_number, 'BANK-OB-'))) {
                return response()->json(['message' => 'This income record represents a Bank Opening Balance and cannot be edited here. Edit the Bank Account instead.'], 403);
            }

            $validated = $request->validate([
                'client' => 'required|string',
                'source' => 'required|string',
                'amount' => 'required|numeric|min:0.01',
                'method' => 'nullable|string',
                'bank_account_id' => 'nullable|exists:bank_accounts,id',
                'received_date' => 'nullable|date',
                'status' => 'nullable|string',
                'transaction_id' => 'nullable|string',
                'invoice_no' => 'nullable|string',
                'project' => 'nullable|string',
                'category' => 'nullable|string',
                'currency' => 'nullable|string',
                'bank' => 'nullable|string',
                'gst_applied' => 'nullable|string',
                'gst_percent' => 'nullable|numeric',
                'gst_amount' => 'nullable|numeric',
                'net_amount' => 'nullable|numeric',
                'staff' => 'nullable|string',
                'department' => 'nullable|string',
                'notes' => 'nullable|string',
                'description' => 'nullable|string',
                'reference_number' => 'nullable|string',
                'invoice_date' => 'nullable|date',
                'due_date' => 'nullable|date',
                'recurring' => 'nullable|string',
                'frequency' => 'nullable|string',
                'client_email' => 'nullable|string|email',
                'client_phone' => 'nullable|string',
                'payment_terms' => 'nullable|string',
                'discount_applied' => 'nullable|string',
                'discount_amount' => 'nullable|numeric',
                'late_fee' => 'nullable|numeric',
                'collection_status' => 'nullable|string',
                'follow_up_date' => 'nullable|date',
                'commission' => 'nullable|numeric',
                'tax_category' => 'nullable|string',
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

            // Determine if income previously had payment activity
            $hasExistingPayments = (self::calculateIncomePaid($income) > 0)
                || Transaction::where('related_id', $income->id)->where('related_type', Income::class)->exists()
                || ((float)($income->initial_deposit_amount ?? 0) > 0);

            if (!$hasExistingPayments && !empty($income->extra_installments) && is_array($income->extra_installments)) {
                foreach ($income->extra_installments as $inst) {
                    $st = strtolower(trim((string)($inst['status'] ?? '')));
                    if (in_array($st, ['paid', 'received', 'completed']) || !empty($inst['is_paid'])) {
                        $hasExistingPayments = true;
                        break;
                    }
                }
            }

            $wasSplit = (!empty($income->extra_installments) && is_array($income->extra_installments) && count($income->extra_installments) > 0)
                || ($income->payment_terms === 'Split Payment');

            $isSplitRequest = (!empty($validated['extra_installments']) && is_array($validated['extra_installments']) && count($validated['extra_installments']) > 0)
                || ($request->input('payment_terms') === 'Split Payment');

            // Requirement 3: Once payment activity exists, lock the selected Single Payment or Split Payment structure
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

            $method = $validated['method'] ?? $income->method ?? 'Bank Account';
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

            $amount = (float) $validated['amount'];
            $discount = isset($validated['discount_amount']) ? (float) $validated['discount_amount'] : 0.0;
            $gst = isset($validated['gst_amount']) ? (float) $validated['gst_amount'] : 0.0;
            $netTotal = max(0.0, $amount - $discount + $gst);
            $validated['net_amount'] = $netTotal;

            if (!$isSplitRequest) {
                // Single Payment: Amount Received is automatically equal to Total Value ($netTotal)
                $validated['initial_deposit_amount'] = $netTotal;
                $validated['initial_deposit_bank_id'] = $validated['bank_account_id'] ?? null;
                $validated['extra_installments'] = null;
                $validated['payment_terms'] = 'Single Payment';
            } else {
                $validated['payment_terms'] = 'Split Payment';
                if (!empty($validated['extra_installments']) && is_array($validated['extra_installments'])) {
                    $normalizedExtra = [];
                    foreach ($validated['extra_installments'] as $idx => $inst) {
                        $instAmt = isset($inst['amount']) && $inst['amount'] !== '' ? (float) $inst['amount'] : 0.0;
                        if ($instAmt > 0) {
                            $inst['status'] = 'Paid';
                            $inst['paid_date'] = !empty($inst['paid_date']) ? $inst['paid_date'] : (!empty($inst['date']) ? $inst['date'] : ($income->received_date ?: now()->toDateString()));
                            $inst['transaction_id'] = !empty($inst['transaction_id']) ? $inst['transaction_id'] : ($income->transaction_id ?: ('PAY-' . $income->id . '-' . ($idx + 1)));
                        } else {
                            $inst['status'] = 'Pending';
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
                // Update the existing payment record and adjust bank balance by the difference
                $existingTxs = Transaction::where('related_id', $income->id)
                    ->where('related_type', Income::class)
                    ->orderBy('id', 'asc')
                    ->get();

                $primaryTx = $existingTxs->first();
                $newBankId = $validated['bank_account_id'] ?? null;
                $newBank = $newBankId ? BankAccount::lockForUpdate()->find($newBankId) : null;
                $date = !empty($validated['received_date']) ? $validated['received_date'] : ($income->received_date ?: now()->toDateString());
                $refId = $validated['transaction_id'] ?? ($validated['reference_number'] ?? ($income->transaction_id ?: ($income->reference_number ?: $income->invoice_no)));
                $txnDesc = \App\Services\LedgerService::generateSourceBasedDescription(
                    $validated['source'] ?? $income->source,
                    $validated['client'] ?? $income->client,
                    $refId,
                    $validated['category'] ?? $income->category,
                    !empty($validated['notes']) ? $validated['notes'] : $income->notes
                );

                if ($primaryTx) {
                    $oldAmount = (float) $primaryTx->amount;
                    $oldBankId = $primaryTx->bank_account_id;
                    $oldMethod = $primaryTx->method;

                    // Clean up any duplicate transactions if they exist from past operations
                    if ($existingTxs->count() > 1) {
                        for ($i = 1; $i < $existingTxs->count(); $i++) {
                            $dup = $existingTxs[$i];
                            if ($dup->bank_account_id) {
                                $dupBank = BankAccount::lockForUpdate()->find($dup->bank_account_id);
                                if ($dupBank) {
                                    $dupBank->current_balance = round((float) $dupBank->current_balance - (float) $dup->amount, 2);
                                    $dupBank->save();
                                }
                            }
                            $dup->delete();
                        }
                    }

                    // Adjust bank balance by the difference
                    if ($oldBankId && $newBankId && (int)$oldBankId === (int)$newBankId) {
                        // Same bank account: adjust only by the difference
                        $diff = round($netTotal - $oldAmount, 2);
                        if ($diff != 0 && $newBank) {
                            $newBank->current_balance = round((float) $newBank->current_balance + $diff, 2);
                            $newBank->save();
                        }
                    } else {
                        // Bank account or method changed: reverse old and credit new
                        if ($oldBankId) {
                            $oldBank = BankAccount::lockForUpdate()->find($oldBankId);
                            if ($oldBank) {
                                $oldBank->current_balance = round((float) $oldBank->current_balance - $oldAmount, 2);
                                $oldBank->save();
                            }
                        }
                        if ($newBank) {
                            $newBank->current_balance = round((float) $newBank->current_balance + $netTotal, 2);
                            $newBank->save();
                        }
                    }

                    // Update existing transaction in place (prevent duplicates and preserve ID)
                    $primaryTx->update([
                        'date' => $date,
                        'amount' => $netTotal,
                        'currency' => $validated['currency'] ?? ($income->currency ?? 'INR'),
                        'category' => $validated['category'] ?? $income->category,
                        'method' => $method,
                        'bank' => $newBank ? ($newBank->bank_name ?? $newBank->nick_name) : ($method === 'Cash' ? 'Cash' : null),
                        'bank_account_id' => $newBankId,
                        'reference_id' => $refId,
                        'description' => $txnDesc,
                        'status' => 'Received',
                    ]);
                } else {
                    // No existing transaction found: create one and credit bank
                    if ($netTotal > 0) {
                        if ($newBank) {
                            $newBank->current_balance = round((float) $newBank->current_balance + $netTotal, 2);
                            $newBank->save();
                        }
                        Transaction::create([
                            'type' => 'Income',
                            'date' => $date,
                            'amount' => $netTotal,
                            'currency' => $validated['currency'] ?? ($income->currency ?? 'INR'),
                            'category' => $validated['category'] ?? $income->category,
                            'method' => $method,
                            'bank' => $newBank ? ($newBank->bank_name ?? $newBank->nick_name) : ($method === 'Cash' ? 'Cash' : null),
                            'bank_account_id' => $newBankId,
                            'reference_id' => $refId,
                            'description' => $txnDesc,
                            'status' => 'Received',
                            'related_id' => $income->id,
                            'related_type' => Income::class,
                        ]);
                    }
                }

                $income->fill($validated);
                $paidAmount = self::calculateIncomePaid($income);
                $income->status = self::getIncomeStatus($netTotal, $paidAmount);
                $income->save();

                return response()->json($income->load('bankAccount'));
            } else {
                // === SPLIT PAYMENT UPDATE ===
                // Update milestones and associated transactions
                $existingTxs = Transaction::where('related_id', $income->id)
                    ->where('related_type', Income::class)
                    ->get();

                $unmatchedTxs = $existingTxs->keyBy('id');
                $updatedExtra = [];

                foreach ($extraInstallments as $idx => $inst) {
                    $status = strtolower(trim((string)($inst['status'] ?? '')));
                    $instAmt = (float) ($inst['amount'] ?? 0);
                    $isPaid = ($instAmt > 0) || in_array($status, ['paid', 'received', 'completed']) || !empty($inst['is_paid']);
                    if ($instAmt > 0) {
                        $inst['status'] = 'Paid';
                    }
                    $instMethod = $inst['method'] ?? 'Bank Account';
                    $instBankId = $inst['bank_account_id'] ?? null;
                    $instTxRef = !empty($inst['transaction_id']) ? $inst['transaction_id'] : ($income->transaction_id ?: ('PAY-' . $income->id . '-' . ($idx + 1)));
                    $instDate = !empty($inst['paid_date']) ? $inst['paid_date'] : (!empty($inst['date']) ? $inst['date'] : ($income->received_date ?: now()->toDateString()));
                    $instClient = $validated['client'] ?? $income->client;
                    $instTxDesc = \App\Services\LedgerService::generateSourceBasedDescription(
                        $income->source,
                        $instClient,
                        $instTxRef,
                        $income->category,
                        $instNote
                    );

                    $bank = $instBankId ? BankAccount::lockForUpdate()->find($instBankId) : null;
                    $inst['bank_name'] = $bank ? ($bank->bank_name . ' - ' . $bank->account_number) : '';
                    $inst['transaction_id'] = $instTxRef;
                    $inst['paid_date'] = $instDate;

                    if ($isPaid && $instAmt > 0) {
                        // Match with an existing transaction by reference_id or first available
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
                            $oldMethod = $matchedTx->method;

                            if ($oldBankId && $instBankId && (int)$oldBankId === (int)$instBankId) {
                                $diff = round($instAmt - $oldAmt, 2);
                                if ($diff != 0 && $bank) {
                                    $bank->current_balance = round((float) $bank->current_balance + $diff, 2);
                                    $bank->save();
                                }
                            } else {
                                if ($oldBankId) {
                                    $oldBank = BankAccount::lockForUpdate()->find($oldBankId);
                                    if ($oldBank) {
                                        $oldBank->current_balance = round((float) $oldBank->current_balance - $oldAmt, 2);
                                        $oldBank->save();
                                    }
                                }
                                if ($bank) {
                                    $bank->current_balance = round((float) $bank->current_balance + $instAmt, 2);
                                    $bank->save();
                                }
                            }

                            $matchedTx->update([
                                'date' => $instDate,
                                'amount' => $instAmt,
                                'currency' => $income->currency ?? 'INR',
                                'category' => $income->category,
                                'method' => $instMethod,
                                'bank' => $bank ? ($bank->bank_name ?? $bank->nick_name) : ($instMethod === 'Cash' ? 'Cash' : null),
                                'bank_account_id' => $instBankId,
                                'reference_id' => $instTxRef,
                                'description' => $instTxDesc,
                                'status' => 'Received',
                            ]);
                        } else {
                            // Create new transaction for this milestone
                            if ($bank) {
                                $bank->current_balance = round((float) $bank->current_balance + $instAmt, 2);
                                $bank->save();
                            }
                            Transaction::create([
                                'type' => 'Income',
                                'date' => $instDate,
                                'amount' => $instAmt,
                                'currency' => $income->currency ?? 'INR',
                                'category' => $income->category,
                                'method' => $instMethod,
                                'bank' => $bank ? ($bank->bank_name ?? $bank->nick_name) : ($instMethod === 'Cash' ? 'Cash' : null),
                                'bank_account_id' => $instBankId,
                                'reference_id' => $instTxRef,
                                'description' => $instTxDesc,
                                'status' => 'Received',
                                'related_id' => $income->id,
                                'related_type' => Income::class,
                            ]);
                        }
                    }

                    $updatedExtra[] = $inst;
                }

                // Delete any remaining unmatched transactions that are no longer paid
                foreach ($unmatchedTxs as $unusedTx) {
                    if ($unusedTx->bank_account_id) {
                        $oldBank = BankAccount::lockForUpdate()->find($unusedTx->bank_account_id);
                        if ($oldBank) {
                            $oldBank->current_balance = round((float) $oldBank->current_balance - (float) $unusedTx->amount, 2);
                            $oldBank->save();
                        }
                    }
                    $unusedTx->delete();
                }

                $validated['extra_installments'] = $updatedExtra;
                $income->fill($validated);
                $paidAmount = self::calculateIncomePaid($income);
                $income->status = self::getIncomeStatus($netTotal, $paidAmount);
                $income->save();

                return response()->json($income->load('bankAccount'));
            }

        });
    }

    /**
     * Record payment against an income or a specific milestone.
     * POST /incomes/{id}/record-payment
     */
    public function recordPayment(Request $request, $id)
    {
        return DB::transaction(function () use ($request, $id) {
            $income = Income::lockForUpdate()->findOrFail($id);
            if ($income->invoice_id || $income->inv_id) {
                return response()->json(['message' => 'Invoice/INV linked income payments must be managed via Invoice module.'], 403);
            }
            if ($income->source === 'Opening Balance' || ($income->reference_number && str_starts_with($income->reference_number, 'BANK-OB-'))) {
                return response()->json(['message' => 'Bank opening balances cannot be modified here.'], 403);
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
            $txnRef = !empty($validated['transaction_id']) ? $validated['transaction_id'] : ('PAY-' . time() . '-' . rand(100, 999));
            $note = $validated['note'] ?? '';

            $bank = BankAccount::find($bankAccountId);
            $bankName = $bank ? ($bank->bank_name . ' - ' . $bank->account_number) : '';

            $netTotal = max(0.0, (float)$income->amount - (float)($income->discount_amount ?? 0) + (float)($income->gst_amount ?? 0));
            $currentPaid = self::calculateIncomePaid($income);
            $outstanding = max(0.0, $netTotal - $currentPaid);

            // Milestone-based payment
            if (isset($validated['installment_index']) && $validated['installment_index'] !== null) {
                $idx = (int) $validated['installment_index'];
                $extra = $income->extra_installments ?? [];

                if (!isset($extra[$idx])) {
                    return response()->json(['message' => 'Milestone not found at index ' . $idx], 404);
                }

                $status = strtolower(trim((string)($extra[$idx]['status'] ?? '')));
                if (in_array($status, ['paid', 'received', 'completed'])) {
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

                $income->extra_installments = $extra;

                // Credit selected bank account
                if ($bank) {
                    $bank->current_balance = round((float)($bank->current_balance ?? 0) + $milestoneAmt, 2);
                    $bank->save();
                }

                // Create transaction
                $recDesc = \App\Services\LedgerService::generateSourceBasedDescription(
                    $income->source,
                    $income->client,
                    $txnRef,
                    $income->category,
                    $note ?: $income->notes
                );

                Transaction::create([
                    'type' => 'Income',
                    'date' => $paymentDate,
                    'amount' => $milestoneAmt,
                    'currency' => $income->currency ?? 'INR',
                    'category' => $income->category,
                    'method' => $method,
                    'bank' => $bank ? ($bank->bank_name ?? $bank->nick_name) : 'Bank Account',
                    'bank_account_id' => $bank ? $bank->id : null,
                    'reference_id' => $txnRef,
                    'description' => $recDesc,
                    'status' => 'Received',
                    'related_id' => $income->id,
                    'related_type' => Income::class,
                ]);
            } else {
                // Single payment
                if ($paymentAmount > $outstanding + 0.01) {
                    return response()->json(['message' => "Payment amount exceeds remaining balance of ₹" . number_format($outstanding, 2)], 422);
                }

                $income->initial_deposit_amount = round((float)($income->initial_deposit_amount ?? 0) + $paymentAmount, 2);
                $income->method = $method;
                $income->received_date = $paymentDate;
                if ($bankAccountId) {
                    $income->bank_account_id = $bankAccountId;
                    $income->initial_deposit_bank_id = $bankAccountId;
                    $income->bank = $bank ? $bank->bank_name : $income->bank;
                }
                if ($txnRef) {
                    $income->transaction_id = $txnRef;
                }

                // Credit selected bank account
                if ($bank) {
                    $bank->current_balance = round((float)($bank->current_balance ?? 0) + $paymentAmount, 2);
                    $bank->save();
                }

                // Create transaction
                $recDesc = \App\Services\LedgerService::generateSourceBasedDescription(
                    $income->source,
                    $income->client,
                    $txnRef,
                    $income->category,
                    $note ?: $income->notes
                );

                Transaction::create([
                    'type' => 'Income',
                    'date' => $paymentDate,
                    'amount' => $paymentAmount,
                    'currency' => $income->currency ?? 'INR',
                    'category' => $income->category,
                    'method' => $method,
                    'bank' => $bank ? ($bank->bank_name ?? $bank->nick_name) : 'Bank Account',
                    'bank_account_id' => $bank ? $bank->id : null,
                    'reference_id' => $txnRef,
                    'description' => $recDesc,
                    'status' => 'Received',
                    'related_id' => $income->id,
                    'related_type' => Income::class,
                ]);
            }

            $newPaid = self::calculateIncomePaid($income);
            $income->status = self::getIncomeStatus($netTotal, $newPaid);
            $income->save();

            return response()->json($income->load('bankAccount'));
        });
    }

    public function destroy($id)
    {
        return DB::transaction(function () use ($id) {
            $income = Income::lockForUpdate()->findOrFail($id);
            if ($income->invoice_id) {
                return response()->json(['message' => 'This income record was created from an Invoice and cannot be deleted here. Delete or edit the Invoice instead.'], 403);
            }
            if ($income->inv_id) {
                return response()->json(['message' => 'This income record was created from an INV and cannot be deleted here. Delete or edit the INV instead.'], 403);
            }
            if ($income->source === 'Opening Balance' || ($income->reference_number && str_starts_with($income->reference_number, 'BANK-OB-'))) {
                return response()->json(['message' => 'This income record represents a Bank Opening Balance and cannot be deleted here. Delete or edit the Bank Account instead.'], 403);
            }

            self::reverseIncomePayments($income);
            $income->delete();
            return response()->json(null, 204);
        });
    }
}
