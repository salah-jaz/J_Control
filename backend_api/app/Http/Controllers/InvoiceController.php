<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Income;
use App\Models\Transaction;
use App\Models\BankAccount;
use Illuminate\Http\Request;

class InvoiceController extends Controller
{
    /**
     * GET next invoice number for display when creating (e.g. INV-2026-00001).
     * Database-agnostic: works with SQLite and MySQL.
     */
    public function nextInvoiceNumber()
    {
        $seq = $this->getNextInvoiceSequence();
        $year = date('Y');
        $prefix = "INV-{$year}-";
        return response()->json(['invoice_number' => $prefix . str_pad((string) $seq, 5, '0', STR_PAD_LEFT)]);
    }

    /**
     * GET invoice summary for dashboard cards with filters.
     */
    public function summary(Request $request)
    {
        $query = Invoice::query();

        if ($request->filled('search')) {
            $term = '%' . $request->input('search') . '%';
            $query->where(function ($q) use ($term) {
                $q->where('client_name', 'like', $term)
                  ->orWhere('invoice_number', 'like', $term);
            });
        }

        if ($request->filled('status') && $request->input('status') !== 'all') {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('client_id')) {
            $query->where('client_id', $request->input('client_id'));
        }

        if ($request->filled('date_from')) {
            $query->whereDate('date', '>=', $request->input('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('date', '<=', $request->input('date_to'));
        }

        $totalInvoices = (clone $query)->count();
        $paidInvoices = (clone $query)->where('status', 'Paid')->count();
        $pendingInvoices = (clone $query)->where('status', 'Pending')->count();
        $overdueInvoices = (clone $query)->where('status', 'Overdue')->count();
        $totalRevenue = (float) (clone $query)->where('status', 'Paid')->sum('grand_total');

        return response()->json([
            'totalInvoices' => $totalInvoices,
            'paidInvoices' => $paidInvoices,
            'pendingInvoices' => $pendingInvoices,
            'overdueInvoices' => $overdueInvoices,
            'totalRevenue' => round($totalRevenue, 2),
        ]);
    }

    public function index(Request $request)
    {
        $query = Invoice::query();

        if ($request->filled('search')) {
            $term = '%' . $request->input('search') . '%';
            $query->where(function ($q) use ($term) {
                $q->where('client_name', 'like', $term)
                  ->orWhere('invoice_number', 'like', $term);
            });
        }

        if ($request->filled('status') && $request->input('status') !== 'all') {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('client_id')) {
            $query->where('client_id', $request->input('client_id'));
        }

        if ($request->filled('date_from')) {
            $query->whereDate('date', '>=', $request->input('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('date', '<=', $request->input('date_to'));
        }

        $perPage = max(1, min(100, (int) $request->input('per_page', 20)));
        return $query->with('items')->orderBy('created_at', 'desc')->paginate($perPage);
    }

    public function show(Invoice $invoice)
    {
        return $invoice->load('items');
    }

    private function computeGrandTotal(float $subtotal, float $gstPercent, string $discountType, float $discountValue): array
    {
        $taxAmount = $subtotal * ($gstPercent / 100);
        $discountAmount = $discountType === 'Percentage'
            ? $subtotal * ($discountValue / 100)
            : $discountValue;
        $grandTotal = max(0, $subtotal - $discountAmount + $taxAmount);
        return [
            'tax_amount' => round($taxAmount, 2),
            'discount_amount' => round($discountAmount, 2),
            'grand_total' => round($grandTotal, 2),
        ];
    }

    private function getPaymentEntries(Invoice $invoice): array
    {
        $entries = [];
        $date = $invoice->date ? $invoice->date->format('Y-m-d') : now()->toDateString();

        if ($invoice->initial_deposit_enabled && (float) $invoice->initial_deposit_amount > 0 && $invoice->initial_deposit_bank_id) {
            $entries[] = [
                'amount' => (float) $invoice->initial_deposit_amount,
                'bank_account_id' => (int) $invoice->initial_deposit_bank_id,
                'date' => $date,
                'note' => 'Initial deposit',
            ];
        }

        foreach ($invoice->extra_installments ?? [] as $row) {
            $amt = (float) ($row['amount'] ?? 0);
            $bankId = isset($row['bank_account_id']) ? (int) $row['bank_account_id'] : null;
            if ($amt > 0 && $bankId) {
                $entries[] = [
                    'amount' => $amt,
                    'bank_account_id' => $bankId,
                    'date' => !empty($row['date']) ? $row['date'] : $date,
                    'note' => $row['notes'] ?? $row['note'] ?? '',
                ];
            }
        }

        return $entries;
    }

    /**
     * Create Transaction records and credit bank balances for an invoice.
     */
    private function applyInvoicePayments(Invoice $invoice, Income $income): void
    {
        $entries = $this->getPaymentEntries($invoice);
        foreach ($entries as $entry) {
            $bank = BankAccount::find($entry['bank_account_id']);
            if (!$bank) {
                continue;
            }
            $bank->current_balance = (float) $bank->current_balance + $entry['amount'];
            $bank->save();

            Transaction::create([
                'type' => 'Income',
                'date' => $entry['date'],
                'amount' => $entry['amount'],
                'currency' => 'INR',
                'category' => 'Sales',
                'method' => 'Bank Transfer',
                'bank' => $bank->bank_name ?? $bank->nick_name,
                'bank_account_id' => $bank->id,
                'reference_id' => $invoice->invoice_number,
                'description' => $entry['note'] ?: "Payment for Invoice {$invoice->invoice_number}",
                'status' => 'Cleared',
                'related_id' => $income->id,
                'related_type' => Income::class,
                'invoice_id' => $invoice->id,
            ]);
        }
    }

    /**
     * Reverse transactions for an invoice: refund Income (credit), add back Expense (debit).
     */
    private function reverseInvoicePayments(Invoice $invoice): void
    {
        $transactions = Transaction::where('invoice_id', $invoice->id)->get();
        foreach ($transactions as $tx) {
            if ($tx->bank_account_id) {
                $bank = BankAccount::find($tx->bank_account_id);
                if ($bank) {
                    $amount = (float) $tx->amount;
                    if ($tx->type === 'Expense') {
                        $bank->current_balance = (float) $bank->current_balance + $amount;
                    } else {
                        $bank->current_balance = (float) $bank->current_balance - $amount;
                    }
                    $bank->save();
                }
            }
            $tx->delete();
        }
    }

    /**
     * Get operational expense entries (Paid only) for applying to bank/transactions.
     */
    private function getOperationalExpenseEntries(Invoice $invoice): array
    {
        $entries = [];
        $date = $invoice->date ? $invoice->date->format('Y-m-d') : now()->toDateString();
        foreach ($invoice->operational_expenses ?? [] as $row) {
            $paid = isset($row['paid']) ? filter_var($row['paid'], FILTER_VALIDATE_BOOLEAN) : false;
            if (!$paid) {
                continue;
            }
            $amt = (float) ($row['amount'] ?? 0);
            $bankId = isset($row['bank_account_id']) ? (int) $row['bank_account_id'] : null;
            if ($amt > 0 && $bankId) {
                $entries[] = [
                    'name' => $row['name'] ?? 'Operational expense',
                    'amount' => $amt,
                    'bank_account_id' => $bankId,
                    'date' => $date,
                ];
            }
        }
        return $entries;
    }

    /**
     * Create Expense transactions and debit bank balances for invoice operational expenses.
     */
    private function applyOperationalExpenses(Invoice $invoice): void
    {
        $entries = $this->getOperationalExpenseEntries($invoice);
        $invNumber = $invoice->invoice_number ?? (string) $invoice->id;
        foreach ($entries as $entry) {
            $bank = BankAccount::find($entry['bank_account_id']);
            if (!$bank) {
                continue;
            }
            $bank->current_balance = (float) $bank->current_balance - $entry['amount'];
            $bank->save();

            Transaction::create([
                'type' => 'Expense',
                'date' => $entry['date'],
                'amount' => $entry['amount'],
                'currency' => 'INR',
                'category' => 'Operational',
                'method' => 'Bank Transfer',
                'bank' => $bank->bank_name ?? $bank->nick_name,
                'bank_account_id' => $bank->id,
                'reference_id' => $invNumber,
                'description' => "Operational expense: {$entry['name']} (Invoice {$invNumber})",
                'status' => 'Cleared',
                'invoice_id' => $invoice->id,
            ]);
        }
    }

    private function syncIncomeFromInvoice(Invoice $invoice): void
    {
        $income = Income::where('invoice_id', $invoice->id)->first();

        $grandTotal = (float) $invoice->grand_total;
        $entries = $this->getPaymentEntries($invoice);
        $paidAmount = array_sum(array_column($entries, 'amount'));
        $status = $paidAmount <= 0 ? 'Unpaid' : ($paidAmount >= round($grandTotal, 2) ? 'Fully Paid' : 'Partially Paid');

        $incomeData = [
            'invoice_id' => $invoice->id,
            'client' => $invoice->client_name,
            'source' => 'Invoice',
            'invoice_no' => $invoice->invoice_number ?? (string) $invoice->id,
            'amount' => $grandTotal,
            'currency' => 'INR',
            'method' => 'Bank Transfer',
            'received_date' => $invoice->date ? $invoice->date->format('Y-m-d') : now()->toDateString(),
            'status' => $status,
            'gst_applied' => (float) $invoice->gst > 0 ? 'Yes' : 'No',
            'gst_percent' => (float) $invoice->gst,
            'gst_amount' => (float) $invoice->amount * ((float) $invoice->gst / 100),
            'net_amount' => (float) $invoice->amount,
            'notes' => "Created from Invoice {$invoice->invoice_number}",
            'category' => 'Sales',
            'bank_account_id' => $invoice->bank_account_id,
            'bank' => $invoice->bank_name,
            'initial_deposit_amount' => $invoice->initial_deposit_enabled ? $invoice->initial_deposit_amount : null,
            'initial_deposit_bank_id' => $invoice->initial_deposit_bank_id,
            'extra_installments' => $invoice->extra_installments,
        ];

        if ($income) {
            $income->update($incomeData);
        } else {
            $income = Income::create($incomeData);
        }

        $this->reverseInvoicePayments($invoice);
        $this->applyInvoicePayments($invoice, $income);
    }

    private function removeIncomeForInvoice(Invoice $invoice): void
    {
        $this->reverseInvoicePayments($invoice);
        Income::where('invoice_id', $invoice->id)->delete();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'client_name' => 'required|string',
            'client_id' => 'nullable',
            'date' => 'required|date',
            'status' => 'required|string|in:Paid,Pending,Overdue',
            'gst' => 'nullable|numeric|min:0',
            'discount_type' => 'nullable|string|in:Flat,Percentage',
            'discount' => 'nullable|numeric|min:0',
            'bank_account_id' => 'required|exists:bank_accounts,id',
            'gpay_number' => 'nullable|string',
            'qr_code' => 'nullable|file|mimes:jpg,jpeg,png',
            'items' => 'nullable|array',
            'items.*.service_name' => 'required|string',
            'items.*.payment_status' => 'nullable|string',
            'items.*.amount' => 'required|numeric',
            'initial_deposit_enabled' => 'nullable|boolean',
            'initial_deposit_amount' => 'nullable|numeric|min:0',
            'initial_deposit_bank_id' => 'nullable|exists:bank_accounts,id',
            'extra_installments' => 'nullable|array',
            'extra_installments.*.date' => 'nullable|date',
            'extra_installments.*.amount' => 'nullable|numeric',
            'extra_installments.*.bank_account_id' => 'nullable|exists:bank_accounts,id',
            'extra_installments.*.notes' => 'nullable|string',
            'operational_expenses' => 'nullable|array',
            'operational_expenses.*.name' => 'nullable|string',
            'operational_expenses.*.amount' => 'nullable|numeric',
            'operational_expenses.*.bank_account_id' => 'nullable|exists:bank_accounts,id',
            'operational_expenses.*.paid' => 'nullable|boolean',
        ]);

        $items = $validated['items'] ?? [];
        $subtotal = collect($items)->sum(fn ($i) => (float) ($i['amount'] ?? 0));
        $gst = (float) ($validated['gst'] ?? 0);
        $discountType = $validated['discount_type'] ?? 'Flat';
        $discountValue = (float) ($validated['discount'] ?? 0);

        $totals = $this->computeGrandTotal($subtotal, $gst, $discountType, $discountValue);

        $bank = BankAccount::find($validated['bank_account_id']);

        $invoiceNumber = $this->generateNextInvoiceNumber();

        $data = [
            'client_id' => $validated['client_id'] ?? null,
            'client_name' => $validated['client_name'],
            'date' => $validated['date'],
            'status' => $validated['status'],
            'amount' => $subtotal,
            'gst' => $gst,
            'discount' => $totals['discount_amount'],
            'discount_type' => $discountType,
            'grand_total' => $totals['grand_total'],
            'bank_account_id' => $validated['bank_account_id'],
            'bank_name' => $bank ? $bank->bank_name : null,
            'account_number' => $bank ? $bank->account_number : null,
            'gpay_number' => $validated['gpay_number'] ?? null,
            'invoice_number' => $invoiceNumber,
            'initial_deposit_enabled' => !empty($validated['initial_deposit_enabled']),
            'initial_deposit_amount' => $validated['initial_deposit_amount'] ?? null,
            'initial_deposit_bank_id' => $validated['initial_deposit_bank_id'] ?? null,
            'extra_installments' => $validated['extra_installments'] ?? null,
            'operational_expenses' => $validated['operational_expenses'] ?? null,
        ];

        if ($request->hasFile('qr_code')) {
            $data['qr_code'] = $request->file('qr_code')->store('qr_codes', 'public');
        }

        $invoice = Invoice::create($data);

        foreach ($items as $item) {
            $invoice->items()->create([
                'service_name' => $item['service_name'],
                'payment_status' => $item['payment_status'] ?? 'Pending',
                'amount' => $item['amount'],
            ]);
        }

        $this->syncIncomeFromInvoice($invoice);
        $this->applyOperationalExpenses($invoice);

        return response()->json($invoice->load('items'), 201);
    }

    /**
     * Get next invoice sequence number for current year. Database-agnostic (SQLite & MySQL).
     */
    private function getNextInvoiceSequence(): int
    {
        $year = date('Y');
        $prefix = "INV-{$year}-";
        $numbers = Invoice::where('invoice_number', 'like', $prefix . '%')
            ->pluck('invoice_number');
        $maxSeq = 0;
        foreach ($numbers as $num) {
            $parts = explode('-', $num);
            $seq = (int) end($parts);
            if ($seq > $maxSeq) {
                $maxSeq = $seq;
            }
        }
        return $maxSeq + 1;
    }

    private function generateNextInvoiceNumber(): string
    {
        $year = date('Y');
        $prefix = "INV-{$year}-";
        $seq = $this->getNextInvoiceSequence();
        return $prefix . str_pad((string) $seq, 5, '0', STR_PAD_LEFT);
    }

    public function update(Request $request, Invoice $invoice)
    {
        $validated = $request->validate([
            'client_name' => 'required|string',
            'client_id' => 'nullable',
            'date' => 'required|date',
            'status' => 'required|string|in:Paid,Pending,Overdue',
            'gst' => 'nullable|numeric|min:0',
            'discount_type' => 'nullable|string|in:Flat,Percentage',
            'discount' => 'nullable|numeric|min:0',
            'bank_account_id' => 'required|exists:bank_accounts,id',
            'gpay_number' => 'nullable|string',
            'qr_code' => 'nullable',
            'items' => 'nullable|array',
            'items.*.service_name' => 'required|string',
            'items.*.payment_status' => 'nullable|string',
            'items.*.amount' => 'required|numeric',
            'initial_deposit_enabled' => 'nullable|boolean',
            'initial_deposit_amount' => 'nullable|numeric|min:0',
            'initial_deposit_bank_id' => 'nullable|exists:bank_accounts,id',
            'extra_installments' => 'nullable|array',
            'extra_installments.*.date' => 'nullable|date',
            'extra_installments.*.amount' => 'nullable|numeric',
            'extra_installments.*.bank_account_id' => 'nullable|exists:bank_accounts,id',
            'extra_installments.*.notes' => 'nullable|string',
            'operational_expenses' => 'nullable|array',
            'operational_expenses.*.name' => 'nullable|string',
            'operational_expenses.*.amount' => 'nullable|numeric',
            'operational_expenses.*.bank_account_id' => 'nullable|exists:bank_accounts,id',
            'operational_expenses.*.paid' => 'nullable|boolean',
        ]);

        $items = $validated['items'] ?? [];
        $subtotal = collect($items)->sum(fn ($i) => (float) ($i['amount'] ?? 0));
        $gst = (float) ($validated['gst'] ?? 0);
        $discountType = $validated['discount_type'] ?? 'Flat';
        $discountValue = (float) ($validated['discount'] ?? 0);

        $totals = $this->computeGrandTotal($subtotal, $gst, $discountType, $discountValue);

        $bank = BankAccount::find($validated['bank_account_id']);

        $data = [
            'client_id' => $validated['client_id'] ?? null,
            'client_name' => $validated['client_name'],
            'date' => $validated['date'],
            'status' => $validated['status'],
            'amount' => $subtotal,
            'gst' => $gst,
            'discount' => $totals['discount_amount'],
            'discount_type' => $discountType,
            'grand_total' => $totals['grand_total'],
            'bank_account_id' => $validated['bank_account_id'],
            'bank_name' => $bank ? $bank->bank_name : null,
            'account_number' => $bank ? $bank->account_number : null,
            'gpay_number' => $validated['gpay_number'] ?? null,
            'initial_deposit_enabled' => !empty($validated['initial_deposit_enabled']),
            'initial_deposit_amount' => $validated['initial_deposit_amount'] ?? null,
            'initial_deposit_bank_id' => $validated['initial_deposit_bank_id'] ?? null,
            'extra_installments' => $validated['extra_installments'] ?? null,
            'operational_expenses' => $validated['operational_expenses'] ?? null,
        ];

        if ($request->hasFile('qr_code')) {
            $data['qr_code'] = $request->file('qr_code')->store('qr_codes', 'public');
        } else {
            unset($data['qr_code']);
        }

        $invoice->update($data);

        $invoice->items()->delete();
        foreach ($items as $item) {
            $invoice->items()->create([
                'service_name' => $item['service_name'],
                'payment_status' => $item['payment_status'] ?? 'Pending',
                'amount' => $item['amount'],
            ]);
        }

        $this->syncIncomeFromInvoice($invoice);
        $this->applyOperationalExpenses($invoice);

        return response()->json($invoice->load('items'));
    }

    public function destroy(Invoice $invoice)
    {
        $this->removeIncomeForInvoice($invoice);
        $invoice->delete();
        return response()->noContent();
    }
}
