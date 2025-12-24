<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use Illuminate\Http\Request;

class ExpenseController extends Controller
{
    public function index()
    {
        $expenses = Expense::latest()->get();
        return response()->json($expenses);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'vendor' => 'required|string',
            'expense_type' => 'required|string',
            'amount' => 'required|numeric',
            'method' => 'required|string',
            'bank_account_id' => 'nullable|exists:bank_accounts,id',
            'paid_date' => 'required|date',
            'status' => 'required|string',
            'transaction_id' => 'nullable|required_unless:method,Cash',
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
        ]);

        $expense = Expense::create($validated);

        // Update Bank Balance (Decrease)
        if ($expense->bank_account_id) {
            $bank = \App\Models\BankAccount::find($expense->bank_account_id);
            if ($bank) {
                $bank->current_balance -= $expense->amount;
                $bank->save();
            }
        }

        // Auto-create transaction
        \App\Models\Transaction::create([
            'type' => 'Expense',
            'date' => $expense->paid_date,
            'amount' => $expense->amount,
            'currency' => $expense->currency ?? 'INR',
            'category' => $expense->category,
            'method' => $expense->method,
            'bank' => $expense->bank,
            'reference_id' => $expense->transaction_id,
            'description' => $expense->notes ?? "Expense for {$expense->vendor}",
            'status' => $expense->status,
            'related_id' => $expense->id,
            'related_type' => \App\Models\Expense::class,
        ]);

        return response()->json($expense, 201);
    }

    public function update(Request $request, $id)
    {
        $expense = Expense::findOrFail($id);
        
        // Capture old values for balance adjustment
        $oldAmount = $expense->amount;
        $oldBankId = $expense->bank_account_id;

        $validated = $request->validate([
            'vendor' => 'required|string',
            'expense_type' => 'required|string',
            'amount' => 'required|numeric',
            'method' => 'required|string',
            'bank_account_id' => 'nullable|exists:bank_accounts,id',
            'paid_date' => 'required|date',
            'status' => 'required|string',
            'transaction_id' => 'nullable|required_unless:method,Cash',
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
        ]);

        $expense->update($validated);

        // Update Bank Balance (Revert Old, Apply New)
        if ($oldBankId) {
             $oldBank = \App\Models\BankAccount::find($oldBankId);
             if ($oldBank) {
                 $oldBank->current_balance += $oldAmount;
                 $oldBank->save();
             }
        }
        if ($expense->bank_account_id) {
             $newBank = \App\Models\BankAccount::find($expense->bank_account_id);
             if ($newBank) {
                 $newBank->current_balance -= $expense->amount;
                 $newBank->save();
             }
        }

        // Auto-update transaction
        $transaction = \App\Models\Transaction::where('related_id', $expense->id)
            ->where('related_type', \App\Models\Expense::class)
            ->first();

        if ($transaction) {
            $transaction->update([
                'date' => $expense->paid_date,
                'amount' => $expense->amount,
                'currency' => $expense->currency ?? 'INR',
                'category' => $expense->category,
                'method' => $expense->method,
                'bank' => $expense->bank,
                'reference_id' => $expense->transaction_id,
                'description' => $expense->notes ?? "Expense for {$expense->vendor}",
                'status' => $expense->status,
            ]);
        }

        return response()->json($expense);
    }

    public function destroy($id)
    {
        $expense = Expense::findOrFail($id);

        // Revert Bank Balance (Increase)
        if ($expense->bank_account_id) {
            $bank = \App\Models\BankAccount::find($expense->bank_account_id);
            if ($bank) {
                $bank->current_balance += $expense->amount;
                $bank->save();
            }
        }

        // Auto-delete transaction
        \App\Models\Transaction::where('related_id', $expense->id)
            ->where('related_type', \App\Models\Expense::class)
            ->delete();

        $expense->delete();

        return response()->json(null, 204);
    }
}
