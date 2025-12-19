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
        ]);

        $expense = Expense::create($validated);

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

        $validated = $request->validate([
            'vendor' => 'required|string',
            'expense_type' => 'required|string',
            'amount' => 'required|numeric',
            'method' => 'required|string',
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
        ]);

        $expense->update($validated);

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

        // Auto-delete transaction
        \App\Models\Transaction::where('related_id', $expense->id)
            ->where('related_type', \App\Models\Expense::class)
            ->delete();

        $expense->delete();

        return response()->json(null, 204);
    }
}
