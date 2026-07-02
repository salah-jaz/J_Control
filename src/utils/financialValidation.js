/**
 * Shared financial validation helper for Incomes and Expenses.
 * Enforces:
 * 1. Bank account is required if payment amount is greater than zero.
 * 2. Total paid (advance + installments) cannot exceed total income/expense value.
 *
 * @param {Object} data
 * @param {number} data.totalAmount - Base - Discount + Tax
 * @param {boolean} data.initialDepositEnabled
 * @param {string|number} data.initialDepositAmount
 * @param {string|number|null} data.initialDepositBankId
 * @param {Array} data.extraInstallments
 * @returns {{ isValid: boolean, message?: string, field?: string }}
 */
export function validateFinancialForm({
  totalAmount,
  initialDepositEnabled,
  initialDepositAmount,
  initialDepositBankId,
  extraInstallments = []
}) {
  const initAmt = initialDepositEnabled ? (parseFloat(initialDepositAmount) || 0) : 0;

  // 1. Bank account validation for initial/advance deposit
  if (initAmt > 0 && !initialDepositBankId) {
    return {
      isValid: false,
      message: "Please select a Bank Account before recording the payment.",
      field: "initialDepositBankId"
    };
  }

  // 2. Initial deposit cannot exceed total amount
  if (initAmt > totalAmount) {
    return {
      isValid: false,
      message: `Payment amount cannot exceed the remaining balance. Remaining Amount: ₹${totalAmount.toLocaleString('en-IN')}.`,
      field: "initialDepositAmount"
    };
  }

  let totalPaidSoFar = initAmt;

  // 3. Validate installments sequentially
  for (let i = 0; i < extraInstallments.length; i++) {
    const inst = extraInstallments[i];
    const instAmt = parseFloat(inst.amount) || 0;

    if (instAmt > 0) {
      if (!inst.bankAccountId) {
        return {
          isValid: false,
          message: "Please select a Bank Account before recording the payment.",
          field: `extraInstallments.${i}.bankAccountId`
        };
      }

      const remainingBeforeThis = totalAmount - totalPaidSoFar;
      if (instAmt > remainingBeforeThis) {
        return {
          isValid: false,
          message: `Payment amount cannot exceed the remaining balance. Remaining Amount: ₹${remainingBeforeThis.toLocaleString('en-IN')}.`,
          field: `extraInstallments.${i}.amount`
        };
      }

      totalPaidSoFar += instAmt;
    }
  }

  return { isValid: true };
}
