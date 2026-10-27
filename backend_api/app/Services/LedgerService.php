<?php

namespace App\Services;

use App\Models\BankAccount;
use App\Models\Transaction;
use Illuminate\Support\Facades\DB;

class LedgerService
{
    /**
     * Generate consistent, reliable source-based description for financial entries.
     */
    public static function generateSourceBasedDescription(
        ?string $source,
        ?string $party,
        ?string $reference = null,
        ?string $category = null,
        ?string $existingDescription = null
    ): string {
        $category = trim((string)$category);
        $source = trim((string)$source);
        $party = trim((string)$party);
        $reference = trim((string)$reference);
        $existing = trim((string)$existingDescription);

        // 1. Opening Balance
        if ($category === 'Opening Balance' || $source === 'Opening Balance' || str_starts_with($reference, 'BANK-OB-') || str_starts_with(strtolower($existing), 'opening balance')) {
            return 'Opening Balance';
        }

        // 2. INV Module
        if ($source === 'INV' || $category === 'INV' || str_starts_with($reference, 'INV-') || str_starts_with($existing, 'INV payment')) {
            if ($existing !== '' && str_starts_with($existing, 'INV payment')) {
                return $existing;
            }
            $partyPart = $party !== '' ? " for {$party}" : "";
            $refPart = $reference !== '' ? " (Jazno: {$reference})" : "";
            return "INV payment{$partyPart}{$refPart}";
        }

        // 3. Manual Income / Other Financial Movements
        $effectiveSource = $source !== '' ? $source : 'Income';
        $partyPart = $party !== '' ? " for {$party}" : "";
        $refPart = $reference !== '' ? " (Ref: {$reference})" : "";

        return "{$effectiveSource} payment{$partyPart}{$refPart}";
    }

    /**
     * Generate consistent, reliable source-based description for expense entries.
     * Expected format: "Expense payment for {vendor} - {title}"
     */
    public static function generateExpenseDescription(
        ?string $vendor,
        ?string $expenseType = null,
        ?string $existingDescription = null
    ): string {
        $vendor = trim((string)$vendor);
        $title = trim((string)$expenseType);
        $existing = trim((string)$existingDescription);

        // Sanitize literal strings of 'undefined' or 'null'
        if (in_array(strtolower($title), ['undefined', 'null'])) {
            $title = '';
        }
        if (in_array(strtolower($vendor), ['undefined', 'null'])) {
            $vendor = '';
        }

        // If existing description is a milestone description e.g. "Milestone #1 payment for salah"
        if ($existing !== '' && preg_match('/^Milestone\s+#\d+\s+payment/i', $existing)) {
            // Strip any trailing " - oldTitle" if present
            $cleaned = preg_replace('/\s+-\s+.*$/', '', $existing);
            if ($vendor !== '' && !str_contains($cleaned, "for {$vendor}")) {
                $cleaned .= " for {$vendor}";
            }
            if ($title !== '' && strcasecmp($title, $vendor) !== 0) {
                return "{$cleaned} - {$title}";
            }
            return $cleaned;
        }

        // Base description for Expense
        if ($vendor !== '' && $title !== '') {
            if (strcasecmp($vendor, $title) === 0) {
                return "Expense payment for {$vendor}";
            }
            return "Expense payment for {$vendor} - {$title}";
        } elseif ($vendor !== '') {
            return "Expense payment for {$vendor}";
        } elseif ($title !== '') {
            return "Expense payment - {$title}";
        }

        return "Expense payment";
    }

    /**
     * Generate consistent description for milestone payments.
     */
    public static function generateMilestoneDescription(
        int $milestoneNumber,
        ?string $vendor,
        ?string $expenseType = null,
        ?string $note = null
    ): string {
        $note = trim((string)$note);
        if ($note !== '') {
            return $note;
        }

        $vendor = trim((string)$vendor);
        $title = trim((string)$expenseType);

        if (in_array(strtolower($title), ['undefined', 'null'])) {
            $title = '';
        }
        if (in_array(strtolower($vendor), ['undefined', 'null'])) {
            $vendor = '';
        }

        $partyPart = $vendor !== '' ? " for {$vendor}" : "";
        $titlePart = ($title !== '' && strcasecmp($title, $vendor) !== 0) ? " - {$title}" : "";

        return "Milestone #{$milestoneNumber} payment{$partyPart}{$titlePart}";
    }

    /**
     * Recalculate running ledger balances (previous_balance, current_balance)
     * and bank account current_balance for a given bank account in chronological order.
     */
    public static function recalculateAccountLedger(?int $bankAccountId): void
    {
        if (!$bankAccountId) {
            return;
        }

        $bankAccount = BankAccount::find($bankAccountId);
        if (!$bankAccount) {
            return;
        }

        // Fetch all transactions for this account in strict deterministic chronological order
        // Opening balance transaction takes precedence if on the same date
        $txns = Transaction::where('bank_account_id', $bankAccountId)
            ->orderBy('date', 'asc')
            ->orderByRaw("CASE WHEN category = 'Opening Balance' OR reference_id LIKE 'BANK-OB-%' THEN 0 ELSE 1 END ASC")
            ->orderBy('created_at', 'asc')
            ->orderBy('id', 'asc')
            ->get();

        // Determine if an Opening Balance transaction exists in the ledger
        $hasOBTx = $txns->contains(function ($tx) {
            return $tx->category === 'Opening Balance'
                || ($tx->reference_id && str_starts_with($tx->reference_id, 'BANK-OB-'))
                || str_starts_with(strtolower((string)$tx->description), 'opening balance');
        });

        // Starting point: 0 if OB transaction is in ledger; otherwise bank's opening_balance
        $runningBalance = $hasOBTx ? 0.0 : (float)($bankAccount->opening_balance ?? 0);

        foreach ($txns as $tx) {
            $prev = round($runningBalance, 2);
            $amt = (float)$tx->amount;

            if (strtolower((string)$tx->type) === 'expense') {
                $runningBalance = round($runningBalance - $amt, 2);
            } else {
                $runningBalance = round($runningBalance + $amt, 2);
            }

            $curr = round($runningBalance, 2);

            if ((float)$tx->previous_balance !== $prev || (float)$tx->current_balance !== $curr) {
                DB::table('transactions')
                    ->where('id', $tx->id)
                    ->update([
                        'previous_balance' => $prev,
                        'current_balance' => $curr,
                    ]);
                $tx->previous_balance = $prev;
                $tx->current_balance = $curr;
            }
        }

        $finalBalance = round($runningBalance, 2);

        DB::table('bank_accounts')
            ->where('id', $bankAccountId)
            ->update(['current_balance' => $finalBalance]);

        $bankAccount->current_balance = $finalBalance;
    }

    /**
     * Recalculate running balances for all bank accounts across the ERP.
     */
    public static function syncAllLedgers(): void
    {
        $accounts = BankAccount::all();
        foreach ($accounts as $account) {
            self::recalculateAccountLedger($account->id);
        }
    }
}
