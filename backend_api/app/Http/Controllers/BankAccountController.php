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
            'account_number' => 'required|string',
            'ifsc_code' => 'required|string',
            'branch_name' => 'nullable|string',
            'micr_code' => 'nullable|string',
            'swift_code' => 'nullable|string',
            'opening_balance' => 'nullable|numeric',
            'currency' => 'nullable|string',
            'status' => 'nullable|string',
            'opening_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

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
            'account_number' => 'required|string',
            'ifsc_code' => 'required|string',
            'branch_name' => 'nullable|string',
            'micr_code' => 'nullable|string',
            'swift_code' => 'nullable|string',
            'opening_balance' => 'nullable|numeric',
            'currency' => 'nullable|string',
            'status' => 'nullable|string',
            'opening_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        $bankAccount->update($validated);
        return $bankAccount;
    }

    public function destroy($id)
    {
        $bankAccount = BankAccount::findOrFail($id);
        $bankAccount->delete();
        return response()->json(['message' => 'Deleted successfully']);
    }
}
