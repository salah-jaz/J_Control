<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class TransactionController extends Controller
{
    public function index()
    {
        $transactions = \App\Models\Transaction::with('related')->latest()->get();
        
        $data = $transactions->map(function($txn) {
            $party = '';
            if ($txn->related_type === 'App\Models\Income' && $txn->related) {
                $party = $txn->related->customer;
            } elseif ($txn->related_type === 'App\Models\Expense' && $txn->related) {
                $party = $txn->related->vendor;
            }

            return [
                'id' => $txn->id, // internal id
                'transactionId' => $txn->reference_id ?? 'TXN-'.$txn->id, // Use external ref or fallback
                'type' => $txn->type,
                'date' => $txn->date,
                'amount' => $txn->amount,
                'currency' => $txn->currency,
                'category' => $txn->category,
                'method' => $txn->method, // 'paymentMode' in frontend
                'bank' => $txn->bank,
                'reference' => $txn->reference_id,
                'description' => $txn->description,
                'status' => $txn->status,
                'party' => $party,
            ];
        });

        return response()->json($data);
    }
}
