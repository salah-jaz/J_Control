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

        return response()->json($invoice->load('items'));
    }

    public function destroy(Invoice $invoice)
    {
        $invoice->delete();
        return response()->noContent();
    }
}
