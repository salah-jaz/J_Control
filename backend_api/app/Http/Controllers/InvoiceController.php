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
            'customer_name' => 'required',
            'customer_id' => 'nullable',
            'date' => 'required|date',
            'amount' => 'required|numeric',
            'status' => 'required'
        ]);

        return Invoice::create($validated);
    }

    public function update(Request $request, Invoice $invoice)
    {
        $validated = $request->validate([
             'customer_name' => 'required',
            'customer_id' => 'nullable',
            'date' => 'required|date',
            'amount' => 'required|numeric',
            'status' => 'required'
        ]);

        $invoice->update($validated);
        return $invoice;
    }

    public function destroy(Invoice $invoice)
    {
        $invoice->delete();
        return response()->noContent();
    }
}
