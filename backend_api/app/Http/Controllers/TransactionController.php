<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class TransactionController extends Controller
{
    public function index()
    {
        $transactions = \App\Models\Transaction::with(['related', 'bankAccount'])->latest()->get();

        $data = $transactions->map(function ($txn) {
            $party = '';
            $incomeStatus = null;
            $invoiceNo = null;
            if ($txn->related_type === 'App\Models\Income' && $txn->related) {
                $party = $txn->related->client;
                $incomeStatus = $txn->related->status;
                $invoiceNo = $txn->related->invoice_no;
            } elseif ($txn->related_type === 'App\Models\Expense' && $txn->related) {
                $party = $txn->related->vendor;
            }

            $bankName = $txn->bankAccount
                ? ($txn->bankAccount->bank_name . ' - ' . $txn->bankAccount->account_number)
                : ($txn->bank ?? null);

            $filterStatus = $incomeStatus === 'Fully Paid' ? 'Paid' : ($incomeStatus === 'Partially Paid' ? 'Partial' : ($incomeStatus === 'Unpaid' ? 'Unpaid' : null));

            return [
                'id' => (int) $txn->id,
                'relatedId' => $txn->related_id ? (int) $txn->related_id : null,
                'transactionId' => $txn->reference_id ?? 'TXN-' . $txn->id,
                'type' => $txn->type,
                'date' => $txn->date,
                'amount' => $txn->amount,
                'currency' => $txn->currency,
                'category' => $txn->category,
                'method' => $txn->method,
                'bank' => $txn->bank,
                'bankAccountId' => $txn->bank_account_id,
                'bankName' => $bankName,
                'reference' => $txn->reference_id,
                'description' => $txn->description,
                'status' => $txn->status,
                'party' => $party,
                'incomeStatus' => $filterStatus,
                'invoiceNo' => $invoiceNo,
            ];
        });

        return response()->json($data);
    }

    /**
     * Get a single transaction by id (primary key).
     */
    public function show($id)
    {
        $txn = \App\Models\Transaction::with(['related', 'bankAccount'])->findOrFail($id);

        $party = '';
        if ($txn->related_type === 'App\Models\Income' && $txn->related) {
            $party = $txn->related->client;
        } elseif ($txn->related_type === 'App\Models\Expense' && $txn->related) {
            $party = $txn->related->vendor;
        }

        $bankName = $txn->bankAccount
            ? ($txn->bankAccount->bank_name . ' - ' . $txn->bankAccount->account_number)
            : ($txn->bank ?? null);

        return response()->json([
            'id' => $txn->id,
            'transactionId' => $txn->reference_id ?? 'TXN-' . $txn->id,
            'type' => $txn->type,
            'date' => $txn->date,
            'amount' => $txn->amount,
            'currency' => $txn->currency ?? 'INR',
            'category' => $txn->category,
            'method' => $txn->method,
            'bank' => $txn->bank,
            'bankAccountId' => $txn->bank_account_id,
            'bankName' => $bankName,
            'reference' => $txn->reference_id,
            'description' => $txn->description,
            'status' => $txn->status,
            'party' => $party,
            'relatedId' => $txn->related_id,
            'relatedType' => $txn->related_type,
        ]);
    }
}
