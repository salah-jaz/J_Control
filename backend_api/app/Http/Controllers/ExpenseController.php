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
            'paid_date' => 'nullable|date',
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

        // Update Bank Balance (Decrease) ONLY if NOT Pending
        if ($expense->bank_account_id && $expense->status !== 'Pending') {
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
        
        // Capture old values for effective balance adjustment
        // If old status was Pending, effective amount was 0.
        $oldEffectiveAmount = ($expense->status === 'Pending') ? 0 : $expense->amount;
        $oldBankId = $expense->bank_account_id;

        $validated = $request->validate([
            'vendor' => 'required|string',
            'expense_type' => 'required|string',
            'amount' => 'required|numeric',
            'method' => 'required|string',
            'bank_account_id' => 'nullable|exists:bank_accounts,id',
            'paid_date' => 'nullable|date',
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

        // Determine new effective amount
        $newEffectiveAmount = ($expense->status === 'Pending') ? 0 : $expense->amount;
        $newBankId = $expense->bank_account_id;

        // Handle Bank Balance Logic
        if ($oldBankId === $newBankId) {
            // Same bank (or both null)
            if ($oldBankId) {
                // For expense, balance decreases, so we subtract (New - Old). 
                // Wait. 
                // Old: 100 paid (bal -100). New: 150 paid (bal -150). Net change: -50.
                // Formula: bal -= (New - Old). 
                // Let's verify. 
                // Old: 0 (Pending). New: 100 (Paid). Change: 100. bal -= 100. Correct.
                // Old: 100 (Paid). New: 0 (Pending). Change: -100. bal -= -100 => bal += 100. Correct.
                
                $netChange = $newEffectiveAmount - $oldEffectiveAmount;
                if ($netChange != 0) {
                    $bank = \App\Models\BankAccount::find($oldBankId);
                    if ($bank) {
                        $bank->current_balance -= $netChange;
                        $bank->save();
                    }
                }
            }
        } else {
            // Bank changed
            // Revert old effective (Add back to old bank)
            if ($oldBankId && $oldEffectiveAmount != 0) {
                $oldBank = \App\Models\BankAccount::find($oldBankId);
                if ($oldBank) {
                    $oldBank->current_balance += $oldEffectiveAmount;
                    $oldBank->save();
                }
            }
            // Apply new effective (Subtract from new bank)
            if ($newBankId && $newEffectiveAmount != 0) {
                $newBank = \App\Models\BankAccount::find($newBankId);
                if ($newBank) {
                    $newBank->current_balance -= $newEffectiveAmount;
                    $newBank->save();
                }
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

        // Revert Bank Balance (Increase) ONLY if NOT Pending
        if ($expense->bank_account_id && $expense->status !== 'Pending') {
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
