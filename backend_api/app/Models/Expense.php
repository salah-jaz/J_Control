<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

use App\Models\BankAccount;
use App\Models\Invoice;
use App\Models\Transaction;
use App\Services\LedgerService;

class Expense extends Model
{
    use HasFactory;

    protected $fillable = [
        'invoice_id',
        'vendor',
        'expense_type',
        'project',
        'category',
        'bill_no',
        'amount',
        'currency',
        'method',
        'transaction_id',
        'bank',
        'bank_account_id',
        'paid_date',
        'status',
        'gst_applied',
        'gst_percent',
        'gst_amount',
        'net_amount',
        'vendor_gstin',
        'itc_eligible',
        'staff',
        'department',
        'notes',
        'description',
        'location',
        'reference_number',
        'due_date',
        'recurring',
        'frequency',
        'tax_category',
        'approval_status',
        'approved_by',
        'approval_date',
        'tags',
        'priority',
        'reimbursement_status',
        'vendor_email',
        'vendor_phone',
        'discount_amount',
        'initial_deposit_amount',
        'initial_deposit_bank_id',
        'extra_installments',
    ];

    protected $casts = [
        'extra_installments' => 'array',
    ];

    protected $appends = [
        'paid_amount',
        'outstanding_amount',
        'payment_terms',
        'previous_balance',
        'current_balance',
        'source_description',
        'milestones_with_balances',
    ];

    public function resolveTransactions()
    {
        if ($this->relationLoaded('transactions') && $this->transactions->isNotEmpty()) {
            return $this->transactions;
        }

        $txs = $this->transactions()->orderBy('id', 'asc')->get();
        if ($txs->isNotEmpty()) {
            return $txs;
        }

        $query = Transaction::query();
        $matched = false;

        if ($this->id) {
            $query->where(function ($q) {
                $q->where('related_id', $this->id)
                  ->where('related_type', Expense::class);
            });
            $matched = true;
        }

        if ($this->invoice_id) {
            $query->orWhere('invoice_id', $this->invoice_id);
            $matched = true;
        }

        if ($this->transaction_id) {
            $query->orWhere('reference_id', $this->transaction_id);
            $matched = true;
        }

        if ($this->reference_number) {
            $query->orWhere('reference_id', $this->reference_number);
            $matched = true;
        }

        if ($this->id) {
            $query->orWhere('reference_id', 'like', 'EXP-PAY-' . $this->id . '-%');
            $matched = true;
        }

        if (!$matched) {
            return collect();
        }

        $results = $query->orderBy('id', 'asc')->get();

        foreach ($results as $res) {
            if (!$res->related_id && !$res->related_type && $this->id) {
                $res->update([
                    'related_id' => $this->id,
                    'related_type' => Expense::class,
                ]);
            }
            if ($this->vendor && ($res->description === "Expense payment for {$this->vendor}" || str_starts_with(strtolower((string)$res->description), 'expense payment'))) {
                $expectedDesc = LedgerService::generateExpenseDescription($this->vendor, $this->expense_type, $res->description);
                if ($res->description !== $expectedDesc) {
                    $res->update(['description' => $expectedDesc]);
                }
            }
            if ($res->previous_balance === null && $res->bank_account_id) {
                LedgerService::recalculateAccountLedger($res->bank_account_id);
                $res->refresh();
            }
        }

        return $results;
    }

    public function getPreviousBalanceAttribute(): ?float
    {
        $txs = $this->resolveTransactions();
        $tx = $txs->sortBy('id')->first();
        return $tx && $tx->previous_balance !== null ? (float) $tx->previous_balance : null;
    }

    public function getCurrentBalanceAttribute(): ?float
    {
        $txs = $this->resolveTransactions();
        $tx = $txs->sortBy('id')->last();
        return $tx && $tx->current_balance !== null ? (float) $tx->current_balance : null;
    }

    public function getMilestonesWithBalancesAttribute(): ?array
    {
        if (empty($this->extra_installments) || !is_array($this->extra_installments)) {
            return null;
        }

        $txs = $this->resolveTransactions();
        $txMap = $txs->keyBy('reference_id');
        $milestones = [];
        foreach ($this->extra_installments as $idx => $inst) {
            $ref = $inst['transaction_id'] ?? ('EXP-PAY-' . $this->id . '-' . ($idx + 1));
            $tx = $txMap->get($ref);
            $inst['previous_balance'] = $tx && $tx->previous_balance !== null ? (float)$tx->previous_balance : null;
            $inst['current_balance'] = $tx && $tx->current_balance !== null ? (float)$tx->current_balance : null;
            $milestones[] = $inst;
        }
        return $milestones;
    }

    public function getPaidAmountAttribute(): float
    {
        return \App\Http\Controllers\ExpenseController::calculateExpensePaid($this);
    }

    public function getOutstandingAmountAttribute(): float
    {
        $net = (float) ($this->net_amount ?? max(0.0, (float)$this->amount - (float)($this->discount_amount ?? 0) + (float)($this->gst_amount ?? 0)));
        $paid = $this->paid_amount;
        return round(max(0.0, $net - $paid), 2);
    }

    public function getPaymentTermsAttribute(): string
    {
        return (!empty($this->extra_installments) && is_array($this->extra_installments) && count($this->extra_installments) > 0)
            ? 'Split Payment'
            : 'Single Payment';
    }

    public function getSourceDescriptionAttribute(): string
    {
        return LedgerService::generateExpenseDescription(
            $this->vendor,
            $this->expense_type
        );
    }

    public function transactions()
    {
        return $this->morphMany(Transaction::class, 'related');
    }

    public function bankAccount()
    {
        return $this->belongsTo(BankAccount::class, 'bank_account_id');
    }

    public function invoice()
    {
        return $this->belongsTo(Invoice::class);
    }
}
