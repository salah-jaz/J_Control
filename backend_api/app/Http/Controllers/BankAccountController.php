<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

use App\Models\BankAccount;

class BankAccountController extends Controller
{
    public function index()
    {
        return BankAccount::orderBy('created_at', 'desc')->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'bank_name' => 'required|string',
            'account_name' => 'required|string',
            'nick_name' => 'nullable|string',
            'account_type' => 'required|string',
            'account_number' => 'required|string|unique:bank_accounts,account_number',
            'ifsc_code' => 'required|string',
            'branch_name' => 'nullable|string',
            'micr_code' => 'nullable|string',
            'swift_code' => 'nullable|string',
            'opening_balance' => 'nullable|numeric',
            'currency' => 'nullable|string',
            'status' => 'nullable|string',
            'opening_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'qr_code' => 'nullable|image|max:5120',
            'is_default' => 'boolean',
        ]);

        if ($request->hasFile('qr_code')) {
            $path = $request->file('qr_code')->store('bank_qr_codes', 'public');
            $validated['qr_code'] = $path;
        }

        // Initialize current_balance with opening_balance
        $validated['current_balance'] = $validated['opening_balance'] ?? 0;

        if ($request->is_default) {
            BankAccount::where('is_default', true)->update(['is_default' => false]);
        }

        return BankAccount::create($validated);
    }

    public function show($id)
    {
        return BankAccount::findOrFail($id);
    }

    public function update(Request $request, $id)
    {
        $bankAccount = BankAccount::findOrFail($id);
        
        $validated = $request->validate([
            'bank_name' => 'required|string',
            'account_name' => 'required|string',
            'nick_name' => 'nullable|string',
            'account_type' => 'required|string',
            'account_number' => 'required|string|unique:bank_accounts,account_number,' . $id,
            'ifsc_code' => 'required|string',
            'branch_name' => 'nullable|string',
            'micr_code' => 'nullable|string',
            'swift_code' => 'nullable|string',
            'opening_balance' => 'nullable|numeric',
            'current_balance' => 'nullable|numeric',
            'currency' => 'nullable|string',
            'status' => 'nullable|string',
            'opening_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'qr_code' => 'nullable|image|max:5120',
            'is_default' => 'boolean',
        ]);

        if ($request->hasFile('qr_code')) {
            // Delete old QR if exists
            if ($bankAccount->qr_code && \Illuminate\Support\Facades\Storage::disk('public')->exists($bankAccount->qr_code)) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($bankAccount->qr_code);
            }
            $path = $request->file('qr_code')->store('bank_qr_codes', 'public');
            $validated['qr_code'] = $path;
        }

        if ($request->is_default) {
            BankAccount::where('id', '!=', $id)->update(['is_default' => false]);
        }

        $bankAccount->update($validated);
        return $bankAccount;
    }

    public function setDefault($id)
    {
        BankAccount::where('is_default', true)->update(['is_default' => false]);
        $bankAccount = BankAccount::findOrFail($id);
        $bankAccount->update(['is_default' => true]);
        return $bankAccount;
    }

    public function destroy($id)
    {
        $bankAccount = BankAccount::findOrFail($id);
        $bankAccount->delete();
        return response()->json(['message' => 'Deleted successfully']);
    }
}
