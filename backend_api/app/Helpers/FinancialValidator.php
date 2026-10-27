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
     * @param string|null $method
     * @return JsonResponse|null - returns a validation error JsonResponse or null if valid
     */
    public static function validatePayments(
        float $netTotal,
        ?float $initialDeposit = 0.0,
        ?int $initialDepositBankId = null,
        ?array $extraInstallments = [],
        ?string $method = 'Bank Account'
    ): ?JsonResponse {
        $initialDeposit = $initialDeposit ?? 0.0;
        $isCash = strtolower(trim((string)$method)) === 'cash';

        // 1. Bank Account selection is mandatory for initial deposit IF method is Bank Account and amount > 0
        if ($initialDeposit > 0 && !$isCash && !$initialDepositBankId) {
            return response()->json([
                'message' => 'Please select a Bank Account before recording the payment.'
            ], 422);
        }

        // 2. Initial deposit cannot exceed net total
        if ($initialDeposit > $netTotal + 0.01) {
            $formattedNet = number_format($netTotal, 0, '.', ',');
            return response()->json([
                'message' => "Payment amount cannot exceed the remaining balance. Remaining Amount: ₹{$formattedNet}."
            ], 422);
        }

        // 3. Validate milestones/installments
        $milestonesTotal = 0.0;
        foreach ($extraInstallments ?? [] as $idx => $inst) {
            $instAmt = isset($inst['amount']) && $inst['amount'] !== '' ? (float) $inst['amount'] : 0.0;
            if ($instAmt > 0) {
                $instMethod = strtolower(trim((string)($inst['method'] ?? 'bank account')));
                $instIsCash = $instMethod === 'cash';
                $bankId = $inst['bank_account_id'] ?? null;

                if (!$instIsCash && !$bankId && (isset($inst['status']) && strtolower(trim($inst['status'])) === 'paid')) {
                    return response()->json([
                        'message' => "Please select a Bank Account for milestone #" . ($idx + 1) . " before recording payment."
                    ], 422);
                }

                $milestonesTotal += $instAmt;
            }
        }

        // Sum of all milestones cannot exceed netTotal
        if ($milestonesTotal > $netTotal + 0.01) {
            $formattedNet = number_format($netTotal, 0, '.', ',');
            return response()->json([
                'message' => "Total milestone payments (₹" . number_format($milestonesTotal, 0, '.', ',') . ") cannot exceed the total payable amount: ₹{$formattedNet}."
            ], 422);
        }

        return null; // Valid
    }
}
