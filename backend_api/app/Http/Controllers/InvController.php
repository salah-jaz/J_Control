<?php

namespace App\Http\Controllers;

use App\Models\Inv;
use Illuminate\Http\Request;

class InvController extends Controller
{
    /**
     * Display a listing of INV records.
     * Supports search (name, jazno), bank_account_id, status, and date range filters.
     */
    public function index(Request $request)
    {
        $query = Inv::with(['bankAccount', 'income'])->latest('date')->latest('id');

        if ($request->filled('search')) {
            $term = '%' . trim($request->input('search')) . '%';
            $query->where(function ($q) use ($term) {
                $q->where('name', 'like', $term)
                  ->orWhere('jazno', 'like', $term);
            });
        }

        if ($request->filled('bank_account_id')) {
            $query->where('bank_account_id', $request->input('bank_account_id'));
        }

        if ($request->filled('status') && strtolower($request->input('status')) !== 'all') {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('date_from')) {
            $query->whereDate('date', '>=', $request->input('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('date', '<=', $request->input('date_to'));
        }

        if ($request->boolean('all')) {
            return response()->json($query->get());
        }

        $perPage = max(1, min(100, (int) $request->input('per_page', 20)));
        return response()->json($query->paginate($perPage));
    }

    /**
     * Store a newly created INV record.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'jazno' => 'nullable|string|max:255',
            'date' => 'nullable|date',
            'amount' => 'nullable|numeric|min:0',
            'bank_account_id' => 'nullable|exists:bank_accounts,id',
            'status' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $validated['status'] = $validated['status'] ?? 'Received';
        if (empty($validated['bank_account_id'])) {
            $validated['bank_account_id'] = null;
        }
        if (!isset($validated['amount']) || $validated['amount'] === '' || $validated['amount'] === null) {
            $validated['amount'] = 0.00;
        }

        $inv = Inv::create($validated);

        return response()->json($inv->load(['bankAccount', 'income']), 201);
    }

    /**
     * Display the specified INV record.
     */
    public function show($id)
    {
        $inv = Inv::with(['bankAccount', 'income'])->findOrFail($id);
        return response()->json($inv);
    }

    /**
     * Update the specified INV record.
     */
    public function update(Request $request, $id)
    {
        $inv = Inv::findOrFail($id);

        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'jazno' => 'nullable|string|max:255',
            'date' => 'nullable|date',
            'amount' => 'nullable|numeric|min:0',
            'bank_account_id' => 'nullable|exists:bank_accounts,id',
            'status' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        if (array_key_exists('bank_account_id', $validated) && empty($validated['bank_account_id'])) {
            $validated['bank_account_id'] = null;
        }
        if (array_key_exists('amount', $validated) && ($validated['amount'] === '' || $validated['amount'] === null)) {
            $validated['amount'] = 0.00;
        }

        $inv->update($validated);

        return response()->json($inv->load(['bankAccount', 'income']));
    }

    /**
     * Remove the specified INV record.
     */
    public function destroy($id)
    {
        $inv = Inv::findOrFail($id);
        $inv->delete();

        return response()->json(null, 204);
    }
}
