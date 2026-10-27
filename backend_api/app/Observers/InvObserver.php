<?php

namespace App\Observers;

use App\Models\Inv;
use App\Models\Income;
use App\Models\IncomeCategory;
use App\Models\Transaction;
use App\Models\BankAccount;
use Illuminate\Support\Facades\DB;

class InvObserver
{
    public function created(Inv $inv): void
    {
        self::syncIncomeFromInv($inv);
    }

    public function updated(Inv $inv): void
    {
        self::syncIncomeFromInv($inv);
    }

    public function deleted(Inv $inv): void
    {
        self::removeIncomeForInv($inv);
    }

    /**
     * Synchronize linked Income, Transaction, and Bank Account balance for an INV record.
     */
    public static function syncIncomeFromInv(Inv $inv): void
    {
        DB::transaction(function () use ($inv) {
            $amount = (float) ($inv->amount ?? 0);
            $date = $inv->date ? (is_string($inv->date) ? $inv->date : $inv->date->format('Y-m-d')) : now()->toDateString();
            $newBankId = $inv->bank_account_id ? (int) $inv->bank_account_id : null;

            // Ensure 'INV' category exists
            try {
                IncomeCategory::firstOrCreate(['name' => 'INV']);
            } catch (\Throwable $e) {}

            $income = Income::where('inv_id', $inv->id)->first();

            $prevTx = null;
            if ($income) {
                $prevTx = Transaction::where('inv_id', $inv->id)
                    ->orWhere(function ($q) use ($income) {
                        $q->where('related_id', $income->id)
                          ->where('related_type', Income::class);
                    })
                    ->first();
            }

            // Financial balance synchronization
            if ($prevTx) {
                $oldBankId = $prevTx->bank_account_id ? (int) $prevTx->bank_account_id : null;
                $oldAmount = (float) $prevTx->amount;

                if ($oldBankId === $newBankId) {
                    // Same bank account: apply delta if account is set
                    if ($newBankId) {
                        $bank = BankAccount::find($newBankId);
                        if ($bank) {
                            $bank->current_balance = (float) $bank->current_balance - $oldAmount + $amount;
                            $bank->save();
                        }
                    }
                } else {
                    // Bank account changed: reverse old and credit new
                    if ($oldBankId) {
                        $oldBank = BankAccount::find($oldBankId);
                        if ($oldBank) {
                            $oldBank->current_balance = (float) $oldBank->current_balance - $oldAmount;
                            $oldBank->save();
                        }
                    }
                    if ($newBankId) {
                        $newBank = BankAccount::find($newBankId);
                        if ($newBank) {
                            $newBank->current_balance = (float) $newBank->current_balance + $amount;
                            $newBank->save();
                        }
                    }
                }
            } else {
                // Initial creation
                if ($newBankId) {
                    $bank = BankAccount::find($newBankId);
                    if ($bank) {
                        $bank->current_balance = (float) $bank->current_balance + $amount;
                        $bank->save();
                    }
                }
            }

            $currentBank = $newBankId ? BankAccount::find($newBankId) : null;

            $clientName = trim((string) $inv->name);
            if ($clientName === '') {
                $clientName = $inv->jazno ? "INV {$inv->jazno}" : "INV #{$inv->id}";
            }

            $refNumber = $inv->jazno ?: ('INV-' . $inv->id);
            $notesText = "INV payment" . ($inv->name ? " for {$inv->name}" : "") . ($inv->jazno ? " (Jazno: {$inv->jazno})" : "");
            $descText = "INV entry" . ($inv->jazno ? " - {$inv->jazno}" : " #{$inv->id}");

            $incomeData = [
                'inv_id' => $inv->id,
                'client' => $clientName,
                'source' => 'INV',
                'category' => 'INV',
                'amount' => $amount,
                'net_amount' => $amount,
                'currency' => $currentBank ? ($currentBank->currency ?: 'INR') : 'INR',
                'method' => $currentBank ? 'Bank Transfer' : 'Cash',
                'bank' => $currentBank ? ($currentBank->bank_name ?? $currentBank->nick_name) : null,
                'bank_account_id' => $newBankId,
                'initial_deposit_amount' => $amount,
                'initial_deposit_bank_id' => $newBankId,
                'status' => 'Received',
                'received_date' => $date,
                'invoice_date' => $date,
                'reference_number' => 'INV-' . $inv->id,
                'invoice_no' => $refNumber,
                'notes' => $notesText,
                'description' => $descText,
            ];

            if ($income) {
                $income->update($incomeData);
            } else {
                $income = Income::create($incomeData);
            }

            // Sync Transaction
            $tx = Transaction::where('inv_id', $inv->id)
                ->orWhere(function ($q) use ($income) {
                    $q->where('related_id', $income->id)
                      ->where('related_type', Income::class);
                })
                ->first();

            $txData = [
                'type' => 'Income',
                'date' => $date,
                'amount' => $amount,
                'currency' => $currentBank ? ($currentBank->currency ?: 'INR') : 'INR',
                'category' => 'INV',
                'method' => $currentBank ? 'Bank Transfer' : 'Cash',
                'bank' => $currentBank ? ($currentBank->bank_name ?? $currentBank->nick_name) : null,
                'bank_account_id' => $newBankId,
                'reference_id' => $refNumber,
                'description' => $notesText,
                'status' => 'Received',
                'related_id' => $income->id,
                'related_type' => Income::class,
                'inv_id' => $inv->id,
            ];

            if ($tx) {
                $tx->update($txData);
            } else {
                Transaction::create($txData);
            }
        });
    }

    /**
     * Remove linked Income, Transaction, and reverse Bank Account balance when an INV is deleted.
     */
    public static function removeIncomeForInv(Inv $inv): void
    {
        DB::transaction(function () use ($inv) {
            $income = Income::where('inv_id', $inv->id)->first();
            $txQuery = Transaction::where('inv_id', $inv->id);
            if ($income) {
                $txQuery->orWhere(function ($q) use ($income) {
                    $q->where('related_id', $income->id)
                      ->where('related_type', Income::class);
                });
            }

            $txList = $txQuery->get();
            foreach ($txList as $tx) {
                if ($tx->bank_account_id) {
                    $bank = BankAccount::find($tx->bank_account_id);
                    if ($bank) {
                        $bank->current_balance = (float) $bank->current_balance - (float) $tx->amount;
                        $bank->save();
                    }
                }
                $tx->delete();
            }

            if ($income) {
                $income->delete();
            }
        });
    }
}
