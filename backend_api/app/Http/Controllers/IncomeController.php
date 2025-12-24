<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class IncomeController extends Controller
{
    public function index()
    {
        $incomes = \App\Models\Income::latest()->get();
        return response()->json($incomes);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'client' => 'required|string',
            'source' => 'required|string',
            'amount' => 'required|numeric',
            'method' => 'required|string',
            'bank_account_id' => 'nullable|exists:bank_accounts,id',
            'received_date' => 'required|date',
            'status' => 'required|string',
            'transaction_id' => 'nullable|required_unless:method,Cash',
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
        ]);

        $income = \App\Models\Income::create($validated);

        // Update Bank Balance (Increase)
        if ($income->bank_account_id) {
            $bank = \App\Models\BankAccount::find($income->bank_account_id);
            if ($bank) {
                $bank->current_balance += $income->amount;
                $bank->save();
            }
        }

        // Auto-create transaction
        \App\Models\Transaction::create([
            'type' => 'Income',
            'date' => $income->received_date,
            'amount' => $income->amount,
            'currency' => $income->currency ?? 'INR',
            'category' => $income->category,
            'method' => $income->method,
            'bank' => $income->bank,
            'reference_id' => $income->transaction_id,
            'description' => $income->notes ?? "Income from {$income->client}",
            'status' => $income->status,
            'related_id' => $income->id,
            'related_type' => \App\Models\Income::class,
        ]);

        return response()->json($income, 201);
    }

    public function update(Request $request, $id)
    {
        $income = \App\Models\Income::findOrFail($id);
        
        // Capture old values for balance adjustment
        $oldAmount = $income->amount;
        $oldBankId = $income->bank_account_id;

        $validated = $request->validate([
            'client' => 'required|string',
            'source' => 'required|string',
            'amount' => 'required|numeric',
            'method' => 'required|string',
            'bank_account_id' => 'nullable|exists:bank_accounts,id',
            'received_date' => 'required|date',
            'status' => 'required|string',
            'transaction_id' => 'nullable|required_unless:method,Cash',
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
        ]);

        $income->update($validated);

        // Update Bank Balance (Revert Old, Apply New)
        if ($oldBankId) {
             $oldBank = \App\Models\BankAccount::find($oldBankId);
             if ($oldBank) {
                 $oldBank->current_balance -= $oldAmount;
                 $oldBank->save();
             }
        }
        if ($income->bank_account_id) {
             $newBank = \App\Models\BankAccount::find($income->bank_account_id);
             if ($newBank) {
                 $newBank->current_balance += $income->amount;
                 $newBank->save();
             }
        }

        // Auto-update transaction
        $transaction = \App\Models\Transaction::where('related_id', $income->id)
            ->where('related_type', \App\Models\Income::class)
            ->first();

        if ($transaction) {
            $transaction->update([
                'date' => $income->received_date,
                'amount' => $income->amount,
                'currency' => $income->currency ?? 'INR',
                'category' => $income->category,
                'method' => $income->method,
                'bank' => $income->bank,
                'reference_id' => $income->transaction_id,
                'description' => $income->notes ?? "Income from {$income->client}",
                'status' => $income->status,
            ]);
        }

        return response()->json($income);
    }

    public function destroy($id)
    {
        $income = \App\Models\Income::findOrFail($id);
        
        // Revert Bank Balance (Decrease)
        if ($income->bank_account_id) {
            $bank = \App\Models\BankAccount::find($income->bank_account_id);
            if ($bank) {
                $bank->current_balance -= $income->amount;
                $bank->save();
            }
        }
        
        // Auto-delete transaction
        \App\Models\Transaction::where('related_id', $income->id)
            ->where('related_type', \App\Models\Income::class)
            ->delete();

        $income->delete();

        return response()->json(null, 204);
    }
}
