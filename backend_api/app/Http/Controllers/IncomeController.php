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
     * Get status from total vs paid: Unpaid | Partially Paid | Fully Paid.
     */
    private static function getIncomeStatus(float $totalAmount, float $paidAmount): string
    {
        if ($paidAmount <= 0) {
            return 'Unpaid';
        }
        if ($paidAmount >= round($totalAmount, 2)) {
            return 'Fully Paid';
        }
        return 'Partially Paid';
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

    public function index()
    {
        $incomes = \App\Models\Income::latest()->get();
        return response()->json($incomes);
    }

    /**
     * GET /incomes/summary - dashboard aggregates.
     */
    public function summary()
    {
        $incomes = \App\Models\Income::all();
        $totalIncome = 0;
        $totalReceived = 0;

        foreach ($incomes as $income) {
            $amount = (float) $income->amount;
            $totalIncome += $amount;
            $paid = self::getPaidAmount(
                $amount,
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

        $totalAmount = (float) $payload['amount'];
        $initialDeposit = isset($payload['initial_deposit_amount']) ? (float) $payload['initial_deposit_amount'] : null;
        $initialDepositBankId = $payload['initial_deposit_bank_id'] ?? null;
        $extraInstallments = $payload['extra_installments'] ?? [];
        $receivedDate = $payload['received_date'] ?? null;

        $paidAmount = self::getPaidAmount($totalAmount, $initialDeposit, $extraInstallments);
        $status = self::getIncomeStatus($totalAmount, $paidAmount);
        $payload['status'] = $status;

        $income = \App\Models\Income::create($payload);

        $paymentEntries = self::getPaymentEntries($initialDeposit, $initialDepositBankId, $receivedDate, $extraInstallments);
        self::applyIncomePayments($income, $paymentEntries);

        return response()->json($income, 201);
    }

    public function update(Request $request, $id)
    {
        $income = \App\Models\Income::findOrFail($id);

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

        // Reverse existing payments (transactions + bank balances)
        self::reverseIncomePayments($income);

        $totalAmount = (float) $validated['amount'];
        $initialDeposit = isset($validated['initial_deposit_amount']) ? (float) $validated['initial_deposit_amount'] : null;
        $initialDepositBankId = $validated['initial_deposit_bank_id'] ?? null;
        $extraInstallments = $validated['extra_installments'] ?? [];
        $receivedDate = $validated['received_date'] ?? null;

        $paidAmount = self::getPaidAmount($totalAmount, $initialDeposit, $extraInstallments);
        $validated['status'] = self::getIncomeStatus($totalAmount, $paidAmount);

        $income->update($validated);

        $paymentEntries = self::getPaymentEntries($initialDeposit, $initialDepositBankId, $receivedDate, $extraInstallments);
        self::applyIncomePayments($income, $paymentEntries);

        return response()->json($income);
    }

    public function destroy($id)
    {
        $income = \App\Models\Income::findOrFail($id);
        self::reverseIncomePayments($income);
        $income->delete();
        return response()->json(null, 204);
    }
}
