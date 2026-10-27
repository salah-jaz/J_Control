<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

use App\Models\BankAccount;

class BankAccountController extends Controller
{
    public function index()
    {
        BankAccount::ensureDefaultCashAccount();
        return BankAccount::orderBy('created_at', 'desc')->get();
    }

    public function store(Request $request)
    {
        $bankName = strtolower(trim((string)$request->bank_name));
        $accountNum = strtolower(trim((string)$request->account_number));
        if ($bankName === 'cash' || $accountNum === 'cash') {
            $existingCash = BankAccount::whereRaw('LOWER(bank_name) = ?', ['cash'])
                ->orWhereRaw('LOWER(account_number) = ?', ['cash'])
                ->first();
            if ($existingCash) {
                return response()->json([
                    'message' => 'A default Cash account already exists.',
                    'errors' => ['bank_name' => ['A Cash account already exists.']]
                ], 422);
            }
        }

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

        if (array_key_exists('opening_balance', $validated)) {
            $newOpening = (float) ($validated['opening_balance'] ?? 0);
            $validated['current_balance'] = $bankAccount->calculateCurrentBalance($newOpening);
        }

        $bankAccount->update($validated);
        return $bankAccount->fresh();
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
        if (strtolower(trim($bankAccount->bank_name)) === 'cash' || strtolower(trim($bankAccount->account_number)) === 'cash') {
            return response()->json(['message' => 'The default Cash account cannot be deleted.'], 422);
        }
        $bankAccount->delete();
        return response()->json(['message' => 'Deleted successfully']);
    }
}
