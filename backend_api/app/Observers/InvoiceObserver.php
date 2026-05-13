<?php

namespace App\Observers;

use App\Models\Invoice;
use App\Models\Income;
use App\Models\Transaction;
use App\Models\BankAccount;

class InvoiceObserver
{
    public function created(Invoice $invoice)
    {
        $this->syncIncomeFromInvoice($invoice);
        $this->applyOperationalExpenses($invoice);
    }

    public function updated(Invoice $invoice)
    {
        $this->syncIncomeFromInvoice($invoice);
        $this->applyOperationalExpenses($invoice);
    }

    public function deleted(Invoice $invoice)
    {
        $this->removeIncomeForInvoice($invoice);
    }

    private function getPaymentEntries(Invoice $invoice): array
    {
        $entries = [];
        $date = $invoice->date ? $invoice->date->format('Y-m-d') : now()->toDateString();

        if ($invoice->initial_deposit_enabled && (float) $invoice->initial_deposit_amount > 0 && $invoice->initial_deposit_bank_id) {
            $entries[] = [
                'amount' => (float) $invoice->initial_deposit_amount,
                'bank_account_id' => (int) $invoice->initial_deposit_bank_id,
                'date' => $date,
                'note' => 'Initial deposit',
            ];
        }

        foreach ($invoice->extra_installments ?? [] as $row) {
            $amt = (float) ($row['amount'] ?? 0);
            $bankId = isset($row['bank_account_id']) ? (int) $row['bank_account_id'] : null;
            if ($amt > 0 && $bankId) {
                $entries[] = [
                    'amount' => $amt,
                    'bank_account_id' => $bankId,
                    'date' => !empty($row['date']) ? $row['date'] : $date,
                    'note' => $row['notes'] ?? $row['note'] ?? '',
                ];
            }
        }

        return $entries;
    }

    private function applyInvoicePayments(Invoice $invoice): void
    {
        $entries = $this->getPaymentEntries($invoice);
        foreach ($entries as $entry) {
            $bank = BankAccount::find($entry['bank_account_id']);
            if (!$bank) continue;
            
            $bank->current_balance = (float) $bank->current_balance + $entry['amount'];
            $bank->save();

            // Create a separate Income record for EACH payment
            $income = Income::create([
                'invoice_id' => $invoice->id,
                'client' => $invoice->client_name,
                'source' => 'Invoice Payment',
                'invoice_no' => $invoice->invoice_number ?? (string) $invoice->id,
                'amount' => $entry['amount'],
                'currency' => 'INR',
                'method' => 'Bank Transfer',
                'received_date' => $entry['date'],
                'status' => 'Fully Paid',
                'notes' => $entry['note'] ?: "Payment for Invoice {$invoice->invoice_number}",
                'category' => 'Sales',
                'bank_account_id' => $bank->id,
                'bank' => $bank->bank_name ?? $bank->nick_name,
            ]);

            Transaction::create([
                'type' => 'Income',
                'date' => $entry['date'],
                'amount' => $entry['amount'],
                'currency' => 'INR',
                'category' => 'Sales',
                'method' => 'Bank Transfer',
                'bank' => $bank->bank_name ?? $bank->nick_name,
                'bank_account_id' => $bank->id,
                'reference_id' => $invoice->invoice_number,
                'description' => $entry['note'] ?: "Payment for Invoice {$invoice->invoice_number}",
                'status' => 'Cleared',
                'related_id' => $income->id,
                'related_type' => Income::class,
                'invoice_id' => $invoice->id,
            ]);
        }
    }

    private function reverseInvoicePayments(Invoice $invoice): void
    {
        // Remove all Income records and Transactions for this invoice
        Income::where('invoice_id', $invoice->id)->delete();
        
        $transactions = Transaction::where('invoice_id', $invoice->id)->get();
        foreach ($transactions as $tx) {
            if ($tx->bank_account_id) {
                $bank = BankAccount::find($tx->bank_account_id);
                if ($bank) {
                    $amount = (float) $tx->amount;
                    if ($tx->type === 'Expense') {
                        $bank->current_balance = (float) $bank->current_balance + $amount;
                    } else {
                        $bank->current_balance = (float) $bank->current_balance - $amount;
                    }
                    $bank->save();
                }
            }
            $tx->delete();
        }
    }

    private function getOperationalExpenseEntries(Invoice $invoice): array
    {
        $entries = [];
        $date = $invoice->date ? $invoice->date->format('Y-m-d') : now()->toDateString();
        foreach ($invoice->operational_expenses ?? [] as $row) {
            $paid = isset($row['paid']) ? filter_var($row['paid'], FILTER_VALIDATE_BOOLEAN) : false;
            if (!$paid) continue;
            
            $amt = (float) ($row['amount'] ?? 0);
            $bankId = isset($row['bank_account_id']) ? (int) $row['bank_account_id'] : null;
            if ($amt > 0 && $bankId) {
                $entries[] = [
                    'name' => $row['name'] ?? 'Operational expense',
                    'amount' => $amt,
                    'bank_account_id' => $bankId,
                    'date' => $date,
                ];
            }
        }
        return $entries;
    }

    private function applyOperationalExpenses(Invoice $invoice): void
    {
        $entries = $this->getOperationalExpenseEntries($invoice);
        $invNumber = $invoice->invoice_number ?? (string) $invoice->id;
        foreach ($entries as $entry) {
            $bank = BankAccount::find($entry['bank_account_id']);
            if (!$bank) continue;
            
            $bank->current_balance = (float) $bank->current_balance - $entry['amount'];
            $bank->save();

            Transaction::create([
                'type' => 'Expense',
                'date' => $entry['date'],
                'amount' => $entry['amount'],
                'currency' => 'INR',
                'category' => 'Operational',
                'method' => 'Bank Transfer',
                'bank' => $bank->bank_name ?? $bank->nick_name,
                'bank_account_id' => $bank->id,
                'reference_id' => $invNumber,
                'description' => "Operational expense: {$entry['name']} (Invoice {$invNumber})",
                'status' => 'Cleared',
                'invoice_id' => $invoice->id,
            ]);
        }
    }

    private function syncIncomeFromInvoice(Invoice $invoice): void
    {
        // First reverse everything to get a clean state
        $this->reverseInvoicePayments($invoice);
        
        // Then apply current payments (this will create new Income and Transaction records per payment)
        $this->applyInvoicePayments($invoice);
    }

    private function removeIncomeForInvoice(Invoice $invoice): void
    {
        $this->reverseInvoicePayments($invoice);
        Income::where('invoice_id', $invoice->id)->delete();
    }
}
