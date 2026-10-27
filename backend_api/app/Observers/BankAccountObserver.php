<?php

namespace App\Observers;

use App\Models\BankAccount;
use App\Models\Income;
use App\Models\IncomeCategory;
use App\Models\Transaction;
use Illuminate\Support\Facades\DB;

class BankAccountObserver
{
    public function created(BankAccount $bankAccount)
    {
        self::syncOpeningBalance($bankAccount);
    }

    public function updated(BankAccount $bankAccount)
    {
        self::syncOpeningBalance($bankAccount);
    }

    public function deleted(BankAccount $bankAccount)
    {
        self::removeOpeningBalance($bankAccount);
    }

    /**
     * Synchronize bank account opening balance with the Income, Transaction, and BankAccount records.
     */
    public static function syncOpeningBalance(BankAccount $bankAccount): void
    {
        $openingBalance = round((float) ($bankAccount->opening_balance ?? 0), 2);

        // 1. Locate all existing opening balance income records for this bank account
        $incomes = Income::where(function ($q) use ($bankAccount) {
            $q->where('reference_number', 'BANK-OB-' . $bankAccount->id)
              ->orWhere('invoice_no', 'OB-' . str_pad((string) $bankAccount->id, 4, '0', STR_PAD_LEFT))
              ->orWhere(function ($sub) use ($bankAccount) {
                  $sub->where('bank_account_id', $bankAccount->id)
                      ->where(function ($s2) {
                          $s2->where('source', 'Opening Balance')
                             ->orWhere('category', 'Opening Balance')
                             ->orWhere('description', 'like', 'Opening balance%');
                      });
              });
        })->get();

        $incomeIds = $incomes->pluck('id')->filter()->all();

        // 2. Locate all existing opening balance transaction records for this bank account
        $transactions = Transaction::where(function ($q) use ($bankAccount, $incomeIds) {
            $q->where('reference_id', 'BANK-OB-' . $bankAccount->id)
              ->orWhere(function ($sub) use ($bankAccount) {
                  $sub->where('bank_account_id', $bankAccount->id)
                      ->where(function ($s2) {
                          $s2->where('category', 'Opening Balance')
                             ->orWhere('description', 'like', 'Opening balance%');
                      });
              });
            if (!empty($incomeIds)) {
                $q->orWhere(function ($sub) use ($incomeIds) {
                    $sub->where('related_type', Income::class)
                        ->whereIn('related_id', $incomeIds);
                });
            }
        })->get();

        if ($openingBalance > 0) {
            // Ensure IncomeCategory 'Opening Balance' exists
            try {
                IncomeCategory::firstOrCreate(['name' => 'Opening Balance']);
            } catch (\Throwable $e) {
                // Ignore if table/constraint issue
            }

            $isCash = strtolower($bankAccount->bank_name ?? '') === 'cash'
                || strtolower($bankAccount->account_type ?? '') === 'cash'
                || str_contains(strtolower($bankAccount->account_name ?? ''), 'cash')
                || strtolower($bankAccount->account_number ?? '') === 'cash';

            $accountName = $bankAccount->account_name ?: $bankAccount->bank_name;
            $displayName = $isCash ? ($bankAccount->account_name ?: 'Cash Account') : $accountName;
            $method = $isCash ? 'Cash' : 'Bank Account';
            $bankName = $isCash ? 'Cash Account' : ($bankAccount->bank_name ?: $displayName);
            $date = $bankAccount->opening_date ?: now()->toDateString();
            $ref = 'BANK-OB-' . $bankAccount->id;
            $invoiceNo = 'OB-' . str_pad((string) $bankAccount->id, 4, '0', STR_PAD_LEFT);

            $incomeData = [
                'client' => $displayName,
                'source' => 'Opening Balance',
                'category' => 'Opening Balance',
                'amount' => $openingBalance,
                'net_amount' => $openingBalance,
                'currency' => $bankAccount->currency ?: 'INR',
                'method' => $method,
                'bank' => $bankName,
                'bank_account_id' => $bankAccount->id,
                'initial_deposit_amount' => $openingBalance,
                'initial_deposit_bank_id' => $bankAccount->id,
                'status' => 'Received',
                'received_date' => $date,
                'reference_number' => $ref,
                'invoice_no' => $invoiceNo,
                'notes' => 'Opening Balance',
                'description' => 'Opening Balance',
            ];

            // Primary income update or create
            $primaryIncome = $incomes->first();
            if ($primaryIncome) {
                $primaryIncome->update($incomeData);
                // Purge any extra duplicate income records and their linked transactions
                foreach ($incomes->slice(1) as $extraIncome) {
                    Transaction::where('related_id', $extraIncome->id)
                        ->where('related_type', Income::class)
                        ->delete();
                    $extraIncome->delete();
                }
            } else {
                $primaryIncome = Income::create($incomeData);
            }

            $txData = [
                'type' => 'Income',
                'date' => $date,
                'amount' => $openingBalance,
                'currency' => $bankAccount->currency ?: 'INR',
                'category' => 'Opening Balance',
                'method' => $method,
                'bank' => $bankName,
                'bank_account_id' => $bankAccount->id,
                'reference_id' => $ref,
                'description' => 'Opening Balance',
                'status' => 'Received',
                'related_id' => $primaryIncome->id,
                'related_type' => Income::class,
            ];

            // Primary transaction update or create
            $primaryTx = $transactions->first();
            if ($primaryTx) {
                $primaryTx->update($txData);
                // Purge any extra duplicate transactions
                foreach ($transactions->slice(1) as $extraTx) {
                    $extraTx->delete();
                }
            } else {
                Transaction::create($txData);
            }
        } else {
            // Opening balance is 0 or null - completely remove all OB income & transaction records
            foreach ($transactions as $tx) {
                $tx->delete();
            }
            Transaction::where('bank_account_id', $bankAccount->id)
                ->where(function ($q) use ($bankAccount) {
                    $q->where('reference_id', 'BANK-OB-' . $bankAccount->id)
                      ->orWhere('category', 'Opening Balance')
                      ->orWhere('description', 'like', 'Opening balance%');
                })
                ->delete();

            foreach ($incomes as $inc) {
                Transaction::where('related_id', $inc->id)
                    ->where('related_type', Income::class)
                    ->delete();
                $inc->delete();
            }
            Income::where('reference_number', 'BANK-OB-' . $bankAccount->id)->delete();
            Income::where('bank_account_id', $bankAccount->id)
                ->where(function ($q) {
                    $q->where('source', 'Opening Balance')
                      ->orWhere('category', 'Opening Balance')
                      ->orWhere('description', 'like', 'Opening balance%');
                })
                ->delete();
        }

        // 3. Ensure BankAccount current_balance is fully synchronized with opening balance and transactions
        $calculatedBalance = $bankAccount->calculateCurrentBalance($openingBalance);
        if (round((float)($bankAccount->current_balance ?? 0), 2) !== $calculatedBalance) {
            DB::table('bank_accounts')
                ->where('id', $bankAccount->id)
                ->update(['current_balance' => $calculatedBalance]);
            $bankAccount->current_balance = $calculatedBalance;
        }
    }

    /**
     * Remove opening balance income and transaction when a bank account is deleted.
     */
    public static function removeOpeningBalance(BankAccount $bankAccount): void
    {
        $incomes = Income::where(function ($q) use ($bankAccount) {
            $q->where('reference_number', 'BANK-OB-' . $bankAccount->id)
              ->orWhere('invoice_no', 'OB-' . str_pad((string) $bankAccount->id, 4, '0', STR_PAD_LEFT))
              ->orWhere(function ($sub) use ($bankAccount) {
                  $sub->where('bank_account_id', $bankAccount->id)
                      ->where(function ($s2) {
                          $s2->where('source', 'Opening Balance')
                             ->orWhere('category', 'Opening Balance')
                             ->orWhere('description', 'like', 'Opening balance%');
                      });
              });
        })->get();

        $incomeIds = $incomes->pluck('id')->filter()->all();

        Transaction::where(function ($q) use ($bankAccount, $incomeIds) {
            $q->where('reference_id', 'BANK-OB-' . $bankAccount->id)
              ->orWhere(function ($sub) use ($bankAccount) {
                  $sub->where('bank_account_id', $bankAccount->id)
                      ->where(function ($s2) {
                          $s2->where('category', 'Opening Balance')
                             ->orWhere('description', 'like', 'Opening balance%');
                      });
              });
            if (!empty($incomeIds)) {
                $q->orWhere(function ($sub) use ($incomeIds) {
                    $sub->where('related_type', Income::class)
                        ->whereIn('related_id', $incomeIds);
                });
            }
        })->delete();

        foreach ($incomes as $inc) {
            $inc->delete();
        }

        Transaction::where('bank_account_id', $bankAccount->id)
            ->where(function ($q) use ($bankAccount) {
                $q->where('reference_id', 'BANK-OB-' . $bankAccount->id)
                  ->orWhere('category', 'Opening Balance')
                  ->orWhere('description', 'like', 'Opening balance%');
            })
            ->delete();

        Income::where('reference_number', 'BANK-OB-' . $bankAccount->id)->delete();
        Income::where('bank_account_id', $bankAccount->id)
            ->where(function ($q) {
                $q->where('source', 'Opening Balance')
                  ->orWhere('category', 'Opening Balance')
                  ->orWhere('description', 'like', 'Opening balance%');
            })
            ->delete();
    }

    /**
     * Helper to sync all existing bank accounts with opening balances.
     */
    public static function syncAllOpeningBalances(): void
    {
        $accounts = BankAccount::all();

        foreach ($accounts as $account) {
            self::syncOpeningBalance($account);
        }
    }
}
