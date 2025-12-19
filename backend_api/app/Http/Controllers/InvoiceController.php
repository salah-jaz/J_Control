<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use Illuminate\Http\Request;

class InvoiceController extends Controller
{
    public function index()
    {
        return Invoice::orderBy('created_at', 'desc')->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'client_name' => 'required',
            'client_id' => 'nullable',
            'date' => 'required|date',
            'amount' => 'required|numeric',
            'status' => 'required',
            'gst' => 'nullable|numeric',
            'discount' => 'nullable|numeric'
        ]);

        $amount = $validated['amount'];
        $gst = $validated['gst'] ?? 0;
        $discount = $validated['discount'] ?? 0;
        $validated['grand_total'] = max(0, $amount + ($amount * ($gst / 100)) - $discount);

        $invoice = Invoice::create($validated);
        $this->syncIncome($invoice);

        return $invoice;
    }

    public function update(Request $request, Invoice $invoice)
    {
        $validated = $request->validate([
             'client_name' => 'required',
            'client_id' => 'nullable',
            'date' => 'required|date',
            'amount' => 'required|numeric',
            'status' => 'required',
            'gst' => 'nullable|numeric',
            'discount' => 'nullable|numeric'
        ]);

        $amount = $validated['amount'];
        $gst = $validated['gst'] ?? 0; 
        $discount = $validated['discount'] ?? 0;
        $validated['grand_total'] = max(0, $amount + ($amount * ($gst / 100)) - $discount);

        $invoice->update($validated);
        $this->syncIncome($invoice);

        return $invoice;
    }

    public function destroy(Invoice $invoice)
    {
        // Optional: Delete associated income? User didn't ask, so purely deleting invoice.
        $invoice->delete();
        return response()->noContent();
    }

    private function syncIncome(Invoice $invoice)
    {
        if ($invoice->status === 'Paid') {
            $incomeData = [
                'client' => $invoice->client_name,
                'source' => 'Invoice',
                'invoice_no' => (string)$invoice->id,
                'amount' => $invoice->grand_total,
                'currency' => 'INR',
                'method' => 'Bank Transfer', // Default
                'received_date' => date('Y-m-d'),
                'status' => 'Cleared',
                'gst_applied' => ($invoice->gst > 0) ? 'Yes' : 'No',
                'gst_percent' => $invoice->gst ?? 0,
                'gst_amount' => ($invoice->amount * ($invoice->gst ?? 0) / 100),
                'net_amount' => $invoice->amount,
                'notes' => "Auto-generated from Invoice #{$invoice->id}",
                'category' => 'Sales'
            ];

            // Check if income exists
            $income = \App\Models\Income::where('invoice_no', (string)$invoice->id)
                        ->where('source', 'Invoice')
                        ->first();

            if ($income) {
                $income->update($incomeData);
            } else {
                $income = \App\Models\Income::create($incomeData);
            }

            // Sync Transaction
            $transactionData = [
                'type' => 'Income',
                'date' => $income->received_date,
                'amount' => $income->amount,
                'currency' => $income->currency ?? 'INR',
                'category' => $income->category,
                'method' => $income->method,
                'bank' => $income->bank,
                'reference_id' => $income->transaction_id,
                'description' => $income->notes,
                'status' => $income->status,
                'related_id' => $income->id,
                'related_type' => \App\Models\Income::class,
            ];

            $transaction = \App\Models\Transaction::where('related_id', $income->id)
                            ->where('related_type', \App\Models\Income::class)
                            ->first();

            if ($transaction) {
                $transaction->update($transactionData);
            } else {
                \App\Models\Transaction::create($transactionData);
            }
        }
    }
}

