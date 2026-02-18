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
     * GET next invoice number for display when creating (e.g. INV-2026-001).
     */
    public function nextInvoiceNumber()
    {
        $year = date('Y');
        $prefix = "INV-{$year}-";
        $last = Invoice::where('invoice_number', 'like', $prefix . '%')
            ->orderByRaw('CAST(SUBSTRING_INDEX(invoice_number, "-", -1) AS UNSIGNED) DESC')
            ->value('invoice_number');
        $seq = 1;
        if ($last) {
            $parts = explode('-', $last);
            $seq = (int) end($parts) + 1;
        }
        return response()->json(['invoice_number' => $prefix . str_pad((string) $seq, 3, '0', STR_PAD_LEFT)]);
    }

    /**
     * GET invoice summary for dashboard cards.
     */
    public function summary()
    {
        $invoices = Invoice::all();
        $totalInvoices = $invoices->count();
        $paid = 0;
        $pending = 0;
        $overdue = 0;
        $totalRevenue = 0;

        foreach ($invoices as $inv) {
            $gt = (float) $inv->grand_total;
            if ($inv->status === 'Paid') {
                $paid++;
                $totalRevenue += $gt;
            } elseif ($inv->status === 'Overdue') {
                $overdue++;
            } else {
                $pending++;
            }
        }

        return response()->json([
            'totalInvoices' => $totalInvoices,
            'paidInvoices' => $paid,
            'pendingInvoices' => $pending,
            'overdueInvoices' => $overdue,
            'totalRevenue' => round($totalRevenue, 2),
        ]);
    }

    public function index()
    {
        return Invoice::with('items')->orderBy('created_at', 'desc')->get();
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
     * Reverse transactions and debit bank balances for an invoice-linked income.
     */
    private function reverseInvoicePayments(Invoice $invoice): void
    {
        $transactions = Transaction::where('invoice_id', $invoice->id)->get();
        foreach ($transactions as $tx) {
            if ($tx->bank_account_id) {
                $bank = BankAccount::find($tx->bank_account_id);
                if ($bank) {
                    $bank->current_balance = (float) $bank->current_balance - (float) $tx->amount;
                    $bank->save();
                }
            }
            $tx->delete();
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

        return response()->json($invoice->load('items'), 201);
    }

    private function generateNextInvoiceNumber(): string
    {
        $year = date('Y');
        $prefix = "INV-{$year}-";
        $last = Invoice::where('invoice_number', 'like', $prefix . '%')
            ->orderByRaw('CAST(SUBSTRING_INDEX(invoice_number, "-", -1) AS UNSIGNED) DESC')
            ->value('invoice_number');
        $seq = 1;
        if ($last) {
            $parts = explode('-', $last);
            $seq = (int) end($parts) + 1;
        }
        return $prefix . str_pad((string) $seq, 3, '0', STR_PAD_LEFT);
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

        return response()->json($invoice->load('items'));
    }

    public function destroy(Invoice $invoice)
    {
        $this->removeIncomeForInvoice($invoice);
        $invoice->delete();
        return response()->noContent();
    }
}
