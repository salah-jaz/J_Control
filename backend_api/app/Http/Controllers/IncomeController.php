<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class IncomeController extends Controller
{
    /**
     * Get paid amount = initial_deposit_amount + sum(extra_installments amounts).
     */
    private static function getPaidAmount(float $totalAmount, ?float $initialDeposit, array $extraInstallments): float
    {
        $sum = (float) ($initialDeposit ?? 0);
        foreach ($extraInstallments ?? [] as $row) {
            $sum += (float) ($row['amount'] ?? 0);
        }
        return round($sum, 2);
    }

    /**
     * Get status from total vs paid: Pending | Partially Received | Received.
     */
    private static function getIncomeStatus(float $totalAmount, float $paidAmount): string
    {
        if ($paidAmount <= 0) {
            return 'Pending';
        }
        if ($paidAmount >= round($totalAmount, 2)) {
            return 'Received';
        }
        return 'Partially Received';
    }

    /**
     * Build list of payments (amount, bank_account_id, date) from initial deposit + extra installments.
     */
    private static function getPaymentEntries(?float $initialDeposit, ?int $initialDepositBankId, ?string $receivedDate, array $extraInstallments): array
    {
        $entries = [];
        $baseDate = $receivedDate ?: now()->toDateString();

        if ($initialDeposit > 0 && $initialDepositBankId) {
            $entries[] = [
                'amount' => (float) $initialDeposit,
                'bank_account_id' => (int) $initialDepositBankId,
                'date' => $baseDate,
            ];
        }

        foreach ($extraInstallments ?? [] as $row) {
            $amt = (float) ($row['amount'] ?? 0);
            $bankId = isset($row['bank_account_id']) ? (int) $row['bank_account_id'] : null;
            if ($amt > 0 && $bankId) {
                $entries[] = [
                    'amount' => $amt,
                    'bank_account_id' => $bankId,
                    'date' => !empty($row['date']) ? $row['date'] : $baseDate,
                ];
            }
        }

        return $entries;
    }

    /**
     * Create transactions and credit bank balances for the given payment entries (Income).
     */
    private static function applyIncomePayments(\App\Models\Income $income, array $paymentEntries): void
    {
        foreach ($paymentEntries as $entry) {
            $bank = \App\Models\BankAccount::find($entry['bank_account_id']);
            if (!$bank) {
                continue;
            }
            $bank->current_balance += $entry['amount'];
            $bank->save();

            \App\Models\Transaction::create([
                'type' => 'Income',
                'date' => $entry['date'],
                'amount' => $entry['amount'],
                'currency' => $income->currency ?? 'INR',
                'category' => $income->category,
                'method' => $income->method,
                'bank' => $bank->bank_name ?? $bank->nick_name,
                'bank_account_id' => $bank->id,
                'reference_id' => $income->transaction_id,
                'description' => $income->notes ?? "Income from {$income->client}",
                'status' => $income->status,
                'related_id' => $income->id,
                'related_type' => \App\Models\Income::class,
            ]);
        }
    }

    /**
     * Reverse transactions and debit bank balances for an income (by its related transactions).
     */
    private static function reverseIncomePayments(\App\Models\Income $income): void
    {
        $transactions = \App\Models\Transaction::where('related_id', $income->id)
            ->where('related_type', \App\Models\Income::class)
            ->get();

        foreach ($transactions as $tx) {
            if ($tx->bank_account_id) {
                $bank = \App\Models\BankAccount::find($tx->bank_account_id);
                if ($bank) {
                    $bank->current_balance -= $tx->amount;
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
        $query = \App\Models\Income::query()->latest();

        if ($request->filled('search')) {
            $term = '%' . $request->input('search') . '%';
            $query->where(function ($q) use ($term) {
                $q->where('client', 'like', $term)
                    ->orWhere('source', 'like', $term)
                    ->orWhere('invoice_no', 'like', $term)
                    ->orWhere('notes', 'like', $term);
            });
        }

        if ($request->filled('status') && $request->input('status') !== 'all') {
            $status = $request->input('status');
            if ($status === 'Paid' || $status === 'Received') {
                $query->whereIn('status', ['Received', 'Fully Paid']);
            } elseif ($status === 'Partial' || $status === 'Partially Received') {
                $query->whereIn('status', ['Partially Received', 'Partially Paid']);
            } elseif ($status === 'Unpaid' || $status === 'Pending') {
                $query->whereIn('status', ['Pending', 'Unpaid']);
            } else {
                $query->where('status', $status);
            }
        }

        if ($request->filled('category')) {
            $query->where('category', $request->input('category'));
        }

        if ($request->filled('bank_account_id')) {
            $query->where('bank_account_id', $request->input('bank_account_id'));
        }

        if ($request->filled('date_from')) {
            $query->whereDate('received_date', '>=', $request->input('date_from'));
        }
        if ($request->filled('date_to')) {
            $query->whereDate('received_date', '<=', $request->input('date_to'));
        }

        $perPage = max(1, min(100, (int) $request->input('per_page', 20)));
        return $query->paginate($perPage);
    }

    /**
     * GET /incomes/summary - aggregates with the same filters as index().
     * Query params: search, status, category, bank_account_id, date_from, date_to
     */
    public function summary(Request $request)
    {
        $query = \App\Models\Income::query();

        if ($request->filled('search')) {
            $term = '%' . $request->input('search') . '%';
            $query->where(function ($q) use ($term) {
                $q->where('client', 'like', $term)
                    ->orWhere('source', 'like', $term)
                    ->orWhere('invoice_no', 'like', $term)
                    ->orWhere('notes', 'like', $term);
            });
        }

        if ($request->filled('status') && $request->input('status') !== 'all') {
            $status = $request->input('status');
            if ($status === 'Paid' || $status === 'Received') {
                $query->whereIn('status', ['Received', 'Fully Paid']);
            } elseif ($status === 'Partial' || $status === 'Partially Received') {
                $query->whereIn('status', ['Partially Received', 'Partially Paid']);
            } elseif ($status === 'Unpaid' || $status === 'Pending') {
                $query->whereIn('status', ['Pending', 'Unpaid']);
            } else {
                $query->where('status', $status);
            }
        }

        if ($request->filled('category')) {
            $query->where('category', $request->input('category'));
        }

        if ($request->filled('bank_account_id')) {
            $query->where('bank_account_id', $request->input('bank_account_id'));
        }

        if ($request->filled('date_from')) {
            $query->whereDate('received_date', '>=', $request->input('date_from'));
        }
        if ($request->filled('date_to')) {
            $query->whereDate('received_date', '<=', $request->input('date_to'));
        }

        $incomes = $query->get();
        $totalIncome = 0;
        $totalReceived = 0;

        foreach ($incomes as $income) {
            $amount = (float) $income->amount;
            $discount = (float) ($income->discount_amount ?? 0);
            $gst = (float) ($income->gst_amount ?? 0);
            $netTotal = max(0, $amount - $discount + $gst);
            $totalIncome += $netTotal;

            $paid = self::getPaidAmount(
                $netTotal,
                $income->initial_deposit_amount ? (float) $income->initial_deposit_amount : null,
                $income->extra_installments ?? []
            );
            $totalReceived += $paid;
        }

        $totalBalance = round($totalIncome - $totalReceived, 2);
        return response()->json([
            'totalIncome' => round($totalIncome, 2),
            'totalReceived' => round($totalReceived, 2),
            'totalBalance' => $totalBalance,
            'totalCount' => $incomes->count(),
        ]);
    }

    public function store(Request $request)
    {
        // Normalize empty strings to null for optional fields (avoids email/date validation failures)
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
            'amount' => 'required|numeric',
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
            'extra_installments.*.bank_account_id' => 'sometimes|nullable|exists:bank_accounts,id',
            'extra_installments.*.bank_name' => 'sometimes|nullable|string',
            'extra_installments.*.note' => 'sometimes|nullable|string',
        ]);

        $validated['method'] = $validated['method'] ?? 'Other';
        $validated['status'] = $validated['status'] ?? 'Received';
        // NOT NULL columns — ensure we never pass null (form no longer sends these)
        $validated['gst_applied'] = $validated['gst_applied'] ?? 'No';
        $validated['discount_applied'] = $validated['discount_applied'] ?? 'No';
        $validated['recurring'] = $validated['recurring'] ?? 'No';

        // Only pass keys that exist on the Income model to avoid DB errors
        $fillable = (new \App\Models\Income)->getFillable();
        $payload = array_intersect_key($validated, array_flip($fillable));

        $amount = (float) $payload['amount'];
        $discount = isset($payload['discount_amount']) ? (float) $payload['discount_amount'] : 0.0;
        $gst = isset($payload['gst_amount']) ? (float) $payload['gst_amount'] : 0.0;
        $netTotal = max(0.0, $amount - $discount + $gst);
        $payload['net_amount'] = $netTotal;

        $initialDeposit = isset($payload['initial_deposit_amount']) ? (float) $payload['initial_deposit_amount'] : null;
        $initialDepositBankId = $payload['initial_deposit_bank_id'] ?? null;
        $extraInstallments = $payload['extra_installments'] ?? [];
        $receivedDate = $payload['received_date'] ?? null;

        // Perform financial validation
        $valError = \App\Helpers\FinancialValidator::validatePayments($netTotal, $initialDeposit, $initialDepositBankId, $extraInstallments);
        if ($valError) {
            return $valError;
        }

        $paidAmount = self::getPaidAmount($netTotal, $initialDeposit, $extraInstallments);
        $status = self::getIncomeStatus($netTotal, $paidAmount);
        $payload['status'] = $status;

        $income = \App\Models\Income::create($payload);

        $paymentEntries = self::getPaymentEntries($initialDeposit, $initialDepositBankId, $receivedDate, $extraInstallments);
        self::applyIncomePayments($income, $paymentEntries);

        return response()->json($income, 201);
    }

    public function update(Request $request, $id)
    {
        $income = \App\Models\Income::findOrFail($id);
        if ($income->invoice_id) {
            return response()->json(['message' => 'This income record was created from an Invoice and cannot be edited here. Edit the Invoice instead.'], 403);
        }

        $validated = $request->validate([
            'client' => 'required|string',
            'source' => 'required|string',
            'amount' => 'required|numeric',
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
            'extra_installments.*.date' => 'nullable|date',
            'extra_installments.*.amount' => 'nullable|numeric',
            'extra_installments.*.bank_account_id' => 'nullable|exists:bank_accounts,id',
            'extra_installments.*.bank_name' => 'nullable|string',
            'extra_installments.*.note' => 'nullable|string',
        ]);

        $amount = (float) $validated['amount'];
        $discount = isset($validated['discount_amount']) ? (float) $validated['discount_amount'] : 0.0;
        $gst = isset($validated['gst_amount']) ? (float) $validated['gst_amount'] : 0.0;
        $netTotal = max(0.0, $amount - $discount + $gst);
        $validated['net_amount'] = $netTotal;

        $initialDeposit = isset($validated['initial_deposit_amount']) ? (float) $validated['initial_deposit_amount'] : null;
        $initialDepositBankId = $validated['initial_deposit_bank_id'] ?? null;
        $extraInstallments = $validated['extra_installments'] ?? [];
        $receivedDate = $validated['received_date'] ?? null;

        // Perform financial validation first to avoid premature state changes
        $valError = \App\Helpers\FinancialValidator::validatePayments($netTotal, $initialDeposit, $initialDepositBankId, $extraInstallments);
        if ($valError) {
            return $valError;
        }

        // Reverse existing payments (transactions + bank balances)
        self::reverseIncomePayments($income);

        $paidAmount = self::getPaidAmount($netTotal, $initialDeposit, $extraInstallments);
        $validated['status'] = self::getIncomeStatus($netTotal, $paidAmount);

        $income->update($validated);

        $paymentEntries = self::getPaymentEntries($initialDeposit, $initialDepositBankId, $receivedDate, $extraInstallments);
        self::applyIncomePayments($income, $paymentEntries);

        return response()->json($income);
    }

    public function destroy($id)
    {
        $income = \App\Models\Income::findOrFail($id);
        if ($income->invoice_id) {
            return response()->json(['message' => 'This income record was created from an Invoice and cannot be deleted here. Delete or edit the Invoice instead.'], 403);
        }
        self::reverseIncomePayments($income);
        $income->delete();
        return response()->json(null, 204);
    }
}
