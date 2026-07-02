<?php

namespace App\Helpers;

use Illuminate\Http\JsonResponse;

class FinancialValidator
{
    /**
     * Shared backend payment validator for Incomes and Expenses.
     * Enforces bank account requirement and checks that paid amounts do not exceed the total net amount.
     *
     * @param float $netTotal
     * @param float|null $initialDeposit
     * @param int|null $initialDepositBankId
     * @param array|null $extraInstallments
     * @return JsonResponse|null - returns a validation error JsonResponse or null if valid
     */
    public static function validatePayments(float $netTotal, ?float $initialDeposit, ?int $initialDepositBankId, ?array $extraInstallments): ?JsonResponse
    {
        $initialDeposit = $initialDeposit ?? 0.0;

        // 1. Bank Account selection is mandatory for initial deposit
        if ($initialDeposit > 0 && !$initialDepositBankId) {
            return response()->json([
                'message' => 'Please select a Bank Account before recording the payment.'
            ], 422);
        }

        // 2. Initial deposit cannot exceed net total
        if ($initialDeposit > $netTotal) {
            $formattedNet = number_format($netTotal, 0, '.', ',');
            return response()->json([
                'message' => "Payment amount cannot exceed the remaining balance. Remaining Amount: ₹{$formattedNet}."
            ], 422);
        }

        $totalPaidSoFar = $initialDeposit;

        // 3. Validate milestones/installments
        foreach ($extraInstallments ?? [] as $idx => $inst) {
            $instAmt = isset($inst['amount']) && $inst['amount'] !== '' ? (float) $inst['amount'] : 0.0;
            if ($instAmt > 0) {
                // Laravel request array sometimes has 'bank_account_id' instead of camelCase depending on request mapping
                $bankId = $inst['bank_account_id'] ?? null;
                if (!$bankId) {
                    return response()->json([
                        'message' => 'Please select a Bank Account before recording the payment.'
                    ], 422);
                }

                $remainingBeforeThis = round($netTotal - $totalPaidSoFar, 2);
                if ($instAmt > $remainingBeforeThis) {
                    $formattedRemaining = number_format($remainingBeforeThis, 0, '.', ',');
                    return response()->json([
                        'message' => "Payment amount cannot exceed the remaining balance. Remaining Amount: ₹{$formattedRemaining}."
                    ], 422);
                }

                $totalPaidSoFar += $instAmt;
            }
        }

        return null; // Valid
    }
}
