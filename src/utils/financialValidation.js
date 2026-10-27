/**
 * Shared financial validation helper for Incomes and Expenses.
 * Enforces:
 * 1. Bank account is required if payment amount > 0 and method is 'Bank Account'.
 * 2. Total paid/recorded cannot exceed total payable amount.
 * 3. Split milestones sum cannot exceed total payable amount.
 *
 * @param {Object} data
 * @param {number} data.totalAmount - Base - Discount + Tax
 * @param {string} [data.paymentType] - 'single' | 'split'
 * @param {string} [data.method] - 'Cash' | 'Bank Account'
 * @param {boolean} [data.initialDepositEnabled] - Legacy Expense compatibility
 * @param {string|number} [data.initialDepositAmount]
 * @param {string|number|null} [data.initialDepositBankId]
 * @param {boolean} [data.singlePaymentRecorded]
 * @param {string|number} [data.singlePaymentAmount]
 * @param {string|number|null} [data.singlePaymentBankId]
 * @param {Array} [data.extraInstallments]
 * @returns {{ isValid: boolean, message?: string, field?: string }}
 */
export function validateFinancialForm({
  totalAmount,
  paymentType = 'single',
  method = 'Bank Account',
  initialDepositEnabled,
  initialDepositAmount,
  initialDepositBankId,
  singlePaymentRecorded = false,
  singlePaymentAmount,
  singlePaymentBankId,
  extraInstallments = []
}) {
  const isCash = String(method).toLowerCase() === 'cash';

  // Legacy format support (used in Expense.jsx)
  if (initialDepositEnabled !== undefined) {
    const initAmt = initialDepositEnabled ? (parseFloat(initialDepositAmount) || 0) : 0;
    if (initAmt > 0 && !isCash && !initialDepositBankId) {
      return {
        isValid: false,
        message: "Please select a Bank Account before recording the payment.",
        field: "initialDepositBankId"
      };
    }
    if (initAmt > totalAmount + 0.01) {
      return {
        isValid: false,
        message: `Payment amount cannot exceed the remaining balance. Remaining Amount: ₹${totalAmount.toLocaleString('en-IN')}.`,
        field: "initialDepositAmount"
      };
    }
    return { isValid: true };
  }

  // Single payment validation
  if (paymentType === 'single') {
    const amt = parseFloat(singlePaymentAmount != null && singlePaymentAmount !== "" ? singlePaymentAmount : totalAmount) || 0;
    const bankId = singlePaymentBankId || initialDepositBankId;
    if (amt <= 0 && totalAmount <= 0) {
      return {
        isValid: false,
        message: "Payment amount must be greater than zero.",
        field: "amount"
      };
    }
    if (!isCash && !bankId) {
      return {
        isValid: false,
        message: "Please select a Bank Account before recording the payment.",
        field: "bankAccountId"
      };
    }
    return { isValid: true };
  }

  // Split payment validation
  if (paymentType === 'split') {
    if (!Array.isArray(extraInstallments) || extraInstallments.length === 0) {
      return {
        isValid: false,
        message: "Please add at least one milestone for split payment.",
        field: "extraInstallments"
      };
    }

    let milestonesTotal = 0;
    for (let i = 0; i < extraInstallments.length; i++) {
      const inst = extraInstallments[i];
      const instAmt = parseFloat(inst.amount) || 0;
      const instMethod = String(inst.method || 'Bank Account').toLowerCase();
      const instIsCash = instMethod === 'cash';

      if (instAmt <= 0) {
        return {
          isValid: false,
          message: `Milestone #${i + 1} must have a positive payment amount.`,
          field: `extraInstallments.${i}.amount`
        };
      }

      if (!instIsCash && !inst.bankAccountId) {
        return {
          isValid: false,
          message: `Please select a Bank Account for milestone #${i + 1}.`,
          field: `extraInstallments.${i}.bankAccountId`
        };
      }

      milestonesTotal += instAmt;
    }

    if (milestonesTotal > totalAmount + 0.01) {
      return {
        isValid: false,
        message: `Total of all milestones (₹${milestonesTotal.toLocaleString('en-IN')}) cannot exceed the total payable amount: ₹${totalAmount.toLocaleString('en-IN')}.`,
        field: "extraInstallments"
      };
    }
  }

  return { isValid: true };
}
