<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BankAccount extends Model
{
    use HasFactory;

    protected $fillable = [
        'bank_name',
        'account_name',
        'nick_name',
        'account_type',
        'account_number',
        'ifsc_code',
        'branch_name',
        'micr_code',
        'swift_code',
        'opening_balance',
        'current_balance',
        'currency',
        'status',
        'is_default',
        'opening_date',
        'notes',
        'qr_code',
    ];

    protected $casts = [
        'is_default' => 'boolean',
    ];

    /**
     * Ensure a default Cash account exists in bank accounts.
     * Prevents duplicate Cash accounts.
     */
    public static function ensureDefaultCashAccount(): self
    {
        $cash = self::whereRaw('LOWER(bank_name) = ?', ['cash'])
            ->orWhereRaw('LOWER(account_number) = ?', ['cash'])
            ->first();

        if (!$cash) {
            $cash = self::create([
                'bank_name' => 'Cash',
                'account_name' => 'Cash Account',
                'nick_name' => 'Cash',
                'account_type' => 'Cash',
                'account_number' => 'CASH',
                'ifsc_code' => 'CASH0000000',
                'branch_name' => 'Cash in Hand',
                'opening_balance' => 0.00,
                'current_balance' => 0.00,
                'currency' => 'INR',
                'status' => 'Active',
                'is_default' => false,
            ]);
        }

        return $cash;
    }

    /**
     * Calculate current balance based on opening balance and all transaction movements.
     * Excludes opening balance transactions from 'other income' so opening balance is not double-counted.
     */
    public function calculateCurrentBalance(?float $overrideOpeningBalance = null): float
    {
        $ob = $overrideOpeningBalance !== null ? $overrideOpeningBalance : (float) ($this->opening_balance ?? 0);

        // Sum of all non-opening-balance income transactions credited to this bank account
        $otherIncomes = (float) Transaction::where('bank_account_id', $this->id)
            ->where('type', 'Income')
            ->where(function ($q) {
                $q->whereNull('category')->orWhere('category', '!=', 'Opening Balance');
            })
            ->where(function ($q) {
                $q->whereNull('reference_id')->orWhere('reference_id', 'not like', 'BANK-OB-%');
            })
            ->where(function ($q) {
                $q->whereNull('description')->orWhere('description', 'not like', 'Opening balance%');
            })
            ->sum('amount');

        // Sum of all expense transactions debited from this bank account
        $expenses = (float) Transaction::where('bank_account_id', $this->id)
            ->where('type', 'Expense')
            ->sum('amount');

        return round($ob + $otherIncomes - $expenses, 2);
    }
}

