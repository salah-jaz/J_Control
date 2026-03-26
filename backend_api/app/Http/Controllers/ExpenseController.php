<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use Illuminate\Http\Request;

class ExpenseController extends Controller
{
    private static function getPaidAmount(float $totalAmount, ?float $initialDeposit, array $extraInstallments): float
    {
        $sum = (float) ($initialDeposit ?? 0);
        foreach ($extraInstallments ?? [] as $row) {
            $sum += (float) ($row['amount'] ?? 0);
        }
        return round($sum, 2);
    }

    private static function getExpenseStatus(float $totalAmount, float $paidAmount): string
    {
        if ($paidAmount <= 0) {
            return 'Pending';
        }
        if ($paidAmount >= round($totalAmount, 2)) {
            return 'Paid';
        }
        return 'Partial';
    }

    private static function getPaymentEntries(?float $initialDeposit, ?int $initialDepositBankId, ?string $paidDate, array $extraInstallments): array
    {
        $entries = [];
        $baseDate = $paidDate ?: now()->toDateString();

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
     * Debit bank and create Expense transaction for each payment entry.
     */
    private static function applyExpensePayments(Expense $expense, array $paymentEntries): void
    {
        foreach ($paymentEntries as $entry) {
            $bank = \App\Models\BankAccount::find($entry['bank_account_id']);
            if (!$bank) {
                continue;
            }
            $bank->current_balance = (float) ($bank->current_balance ?? 0) - $entry['amount'];
            $bank->save();

            \App\Models\Transaction::create([
                'type' => 'Expense',
                'date' => $entry['date'],
                'amount' => $entry['amount'],
                'currency' => $expense->currency ?? 'INR',
                'category' => $expense->category,
                'method' => $expense->method ?? 'Other',
                'bank' => $bank->bank_name ?? $bank->nick_name ?? null,
                'bank_account_id' => $bank->id,
                'reference_id' => $expense->transaction_id,
                'description' => $expense->notes ?: "Expense for {$expense->vendor}",
                'status' => 'Completed',
                'related_id' => $expense->id,
                'related_type' => Expense::class,
            ]);
        }
    }

    private static function reverseExpensePayments(Expense $expense): void
    {
        $transactions = \App\Models\Transaction::where('related_id', $expense->id)
            ->where('related_type', Expense::class)
            ->get();

        foreach ($transactions as $tx) {
            if ($tx->bank_account_id) {
                $bank = \App\Models\BankAccount::find($tx->bank_account_id);
                if ($bank) {
                    $bank->current_balance = (float) ($bank->current_balance ?? 0) + $tx->amount;
                    $bank->save();
                }
            }
            $tx->delete();
        }
    }

    public function index(Request $request)
    {
        $perPage = (int) $request->get('per_page', 20);
        $perPage = $perPage >= 1 && $perPage <= 100 ? $perPage : 20;

        $query = Expense::query();

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('vendor', 'like', "%{$search}%")
                    ->orWhere('category', 'like', "%{$search}%")
                    ->orWhere('bill_no', 'like', "%{$search}%")
                    ->orWhere('reference_number', 'like', "%{$search}%")
                    ->orWhereRaw('CAST(amount AS CHAR) LIKE ?', ["%{$search}%"]);
            });
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }
        if ($request->filled('bank_account_id')) {
            $query->where('bank_account_id', $request->bank_account_id);
        }
        if ($request->filled('date_from')) {
            $query->whereDate('paid_date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('paid_date', '<=', $request->date_to);
        }

        return $query->orderBy('created_at', 'desc')->paginate($perPage);
    }

    /**
     * GET /expenses/summary - filter-aware aggregates.
     * Query params: search, status, category, bank_account_id, date_from, date_to
     */
    public function summary(Request $request)
    {
        $query = Expense::query();

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('vendor', 'like', "%{$search}%")
                    ->orWhere('category', 'like', "%{$search}%")
                    ->orWhere('bill_no', 'like', "%{$search}%")
                    ->orWhere('reference_number', 'like', "%{$search}%");
            });
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }
        if ($request->filled('bank_account_id')) {
            $query->where('bank_account_id', $request->bank_account_id);
        }
        if ($request->filled('date_from')) {
            $query->whereDate('paid_date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('paid_date', '<=', $request->date_to);
        }

        $expenses = $query->get();
        $totalExpenses = 0;
        $totalPaid = 0;
        $now = now();
        $thisMonthStart = $now->copy()->startOfMonth()->toDateString();
        $thisMonthEnd = $now->copy()->endOfMonth()->toDateString();
        $thisMonthTotal = 0;

        foreach ($expenses as $expense) {
            $amount = (float) $expense->amount;
            $discount = (float) ($expense->discount_amount ?? 0);
            $gst = (float) ($expense->gst_amount ?? 0);
            $total = max(0, $amount - $discount + $gst);
            $totalExpenses += $total;

            $paid = self::getPaidAmount(
                $total,
                $expense->initial_deposit_amount ? (float) $expense->initial_deposit_amount : null,
                $expense->extra_installments ?? []
            );
            $totalPaid += $paid;

            $paidDate = $expense->paid_date;
            if ($paidDate && $paidDate >= $thisMonthStart && $paidDate <= $thisMonthEnd) {
                $thisMonthTotal += $paid;
            }
        }

        $totalBalance = round($totalExpenses - $totalPaid, 2);

        return response()->json([
            'totalExpenses' => round($totalExpenses, 2),
            'totalPaid' => round($totalPaid, 2),
            'totalBalance' => $totalBalance,
            'thisMonthExpenses' => round($thisMonthTotal, 2),
            'totalCount' => $expenses->count(),
        ]);
    }

    public function store(Request $request)
    {
        // Normalize empty strings to null to avoid validation/DB issues
        $request->merge([
            'paid_date' => $request->filled('paid_date') ? $request->input('paid_date') : null,
            'due_date' => $request->filled('due_date') ? $request->input('due_date') : null,
            'vendor_email' => $request->filled('vendor_email') ? $request->input('vendor_email') : null,
            'approval_date' => $request->filled('approval_date') ? $request->input('approval_date') : null,
        ]);
        $installments = $request->input('extra_installments', []);
        if (is_array($installments)) {
            $normalized = [];
            foreach ($installments as $row) {
                $normalized[] = [
                    'date' => !empty($row['date']) ? $row['date'] : null,
                    'amount' => isset($row['amount']) && $row['amount'] !== '' ? $row['amount'] : null,
                    'bank_account_id' => !empty($row['bank_account_id']) ? $row['bank_account_id'] : null,
                    'bank_name' => $row['bank_name'] ?? '',
                    'note' => $row['note'] ?? '',
                ];
            }
            $request->merge(['extra_installments' => $normalized]);
        }

        $validated = $request->validate([
            'vendor' => 'required|string',
            'expense_type' => 'required|string',
            'amount' => 'required|numeric',
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
            'extra_installments.*.bank_account_id' => 'sometimes|nullable|exists:bank_accounts,id',
            'extra_installments.*.bank_name' => 'sometimes|nullable|string',
            'extra_installments.*.note' => 'sometimes|nullable|string',
        ]);

        $validated['method'] = $validated['method'] ?? 'Other';
        $amount = (float) $validated['amount'];
        $discount = (float) ($validated['discount_amount'] ?? 0);
        $gst = (float) ($validated['gst_amount'] ?? 0);
        $validated['net_amount'] = max(0, $amount - $discount + $gst);
        $validated['gst_applied'] = $validated['gst_applied'] ?? 'No';

        $totalAmount = (float) $validated['net_amount'];
        $initialDeposit = isset($validated['initial_deposit_amount']) ? (float) $validated['initial_deposit_amount'] : null;
        $initialDepositBankId = $validated['initial_deposit_bank_id'] ?? null;
        $extraInstallments = $validated['extra_installments'] ?? [];
        $paidDate = $validated['paid_date'] ?? null;

        $paidAmount = self::getPaidAmount($totalAmount, $initialDeposit, $extraInstallments);
        $validated['status'] = self::getExpenseStatus($totalAmount, $paidAmount);

        // Only pass fillable keys to avoid mass-assignment issues
        $fillable = (new Expense)->getFillable();
        $payload = array_intersect_key($validated, array_flip($fillable));

        // Ensure NOT NULL columns are never null (DB defaults may not apply when null is explicitly passed)
        $payload['method'] = $payload['method'] ?? 'Other';
        $payload['currency'] = $payload['currency'] ?? 'INR';
        $payload['gst_applied'] = $payload['gst_applied'] ?? 'No';
        $payload['itc_eligible'] = $payload['itc_eligible'] ?? 'No';
        $payload['approval_status'] = $payload['approval_status'] ?? 'Pending';
        $payload['priority'] = $payload['priority'] ?? 'Medium';
        $payload['recurring'] = $payload['recurring'] ?? 'No';

        $expense = Expense::create($payload);

        $paymentEntries = self::getPaymentEntries($initialDeposit, $initialDepositBankId, $paidDate, $extraInstallments);
        self::applyExpensePayments($expense, $paymentEntries);

        return response()->json($expense, 201);
    }

    public function update(Request $request, $id)
    {
        $expense = Expense::findOrFail($id);
        if ($expense->invoice_id) {
            return response()->json(['message' => 'This expense record was created from an Invoice and cannot be edited here. Edit the Invoice instead.'], 403);
        }

        // Same normalizations as store
        $request->merge([
            'paid_date' => $request->filled('paid_date') ? $request->input('paid_date') : null,
            'due_date' => $request->filled('due_date') ? $request->input('due_date') : null,
            'vendor_email' => $request->filled('vendor_email') ? $request->input('vendor_email') : null,
            'approval_date' => $request->filled('approval_date') ? $request->input('approval_date') : null,
        ]);
        $installments = $request->input('extra_installments', []);
        if (is_array($installments)) {
            $normalized = [];
            foreach ($installments as $row) {
                $normalized[] = [
                    'date' => !empty($row['date']) ? $row['date'] : null,
                    'amount' => isset($row['amount']) && $row['amount'] !== '' ? $row['amount'] : null,
                    'bank_account_id' => !empty($row['bank_account_id']) ? $row['bank_account_id'] : null,
                    'bank_name' => $row['bank_name'] ?? '',
                    'note' => $row['note'] ?? '',
                ];
            }
            $request->merge(['extra_installments' => $normalized]);
        }

        $validated = $request->validate([
            'vendor' => 'required|string',
            'expense_type' => 'required|string',
            'amount' => 'required|numeric',
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
            'extra_installments.*.date' => 'nullable|date',
            'extra_installments.*.amount' => 'nullable|numeric',
            'extra_installments.*.bank_account_id' => 'nullable|exists:bank_accounts,id',
            'extra_installments.*.bank_name' => 'nullable|string',
            'extra_installments.*.note' => 'nullable|string',
        ]);

        $amount = (float) $validated['amount'];
        $discount = (float) ($validated['discount_amount'] ?? 0);
        $gst = (float) ($validated['gst_amount'] ?? 0);
        $validated['net_amount'] = max(0, $amount - $discount + $gst);

        $totalAmount = (float) $validated['net_amount'];
        $initialDeposit = isset($validated['initial_deposit_amount']) ? (float) $validated['initial_deposit_amount'] : null;
        $initialDepositBankId = $validated['initial_deposit_bank_id'] ?? null;
        $extraInstallments = $validated['extra_installments'] ?? [];
        $paidDate = $validated['paid_date'] ?? null;

        self::reverseExpensePayments($expense);

        $paidAmount = self::getPaidAmount($totalAmount, $initialDeposit, $extraInstallments);
        $validated['status'] = self::getExpenseStatus($totalAmount, $paidAmount);

        $fillable = (new Expense)->getFillable();
        $payload = array_intersect_key($validated, array_flip($fillable));

        $payload['method'] = $payload['method'] ?? 'Other';
        $payload['currency'] = $payload['currency'] ?? 'INR';
        $payload['gst_applied'] = $payload['gst_applied'] ?? 'No';
        $payload['itc_eligible'] = $payload['itc_eligible'] ?? 'No';
        $payload['approval_status'] = $payload['approval_status'] ?? 'Pending';
        $payload['priority'] = $payload['priority'] ?? 'Medium';
        $payload['recurring'] = $payload['recurring'] ?? 'No';

        $expense->update($payload);

        $paymentEntries = self::getPaymentEntries($initialDeposit, $initialDepositBankId, $paidDate, $extraInstallments);
        self::applyExpensePayments($expense, $paymentEntries);

        return response()->json($expense);
    }

    public function destroy($id)
    {
        $expense = Expense::findOrFail($id);
        if ($expense->invoice_id) {
            return response()->json(['message' => 'This expense record was created from an Invoice and cannot be deleted here. Delete or edit the Invoice instead.'], 403);
        }
        self::reverseExpensePayments($expense);
        $expense->delete();
        return response()->json(null, 204);
    }
}
