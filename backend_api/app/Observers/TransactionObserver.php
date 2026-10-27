<?php

namespace App\Observers;

use App\Models\Transaction;
use App\Services\LedgerService;

class TransactionObserver
{
    public function created(Transaction $transaction): void
    {
        if ($transaction->bank_account_id) {
            LedgerService::recalculateAccountLedger($transaction->bank_account_id);
        }
    }

    public function updated(Transaction $transaction): void
    {
        $newBank = $transaction->bank_account_id;
        $oldBank = $transaction->getOriginal('bank_account_id');

        if ($newBank) {
            LedgerService::recalculateAccountLedger($newBank);
        }
        if ($oldBank && (int)$oldBank !== (int)$newBank) {
            LedgerService::recalculateAccountLedger($oldBank);
        }
    }

    public function deleted(Transaction $transaction): void
    {
        if ($transaction->bank_account_id) {
            LedgerService::recalculateAccountLedger($transaction->bank_account_id);
        }
    }
}
