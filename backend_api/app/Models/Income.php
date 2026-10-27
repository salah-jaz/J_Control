<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Income extends Model
{
    use HasFactory;

    protected $fillable = [
        'invoice_id',
        'inv_id',
        'client',
        'source',
        'project',
        'category',
        'invoice_no',
        'amount',
        'currency',
        'method',
        'transaction_id',
        'bank',
        'bank_account_id',
        'received_date',
        'status',
        'gst_applied',
        'gst_percent',
        'gst_amount',
        'net_amount',
        'staff',
        'department',
        'notes',
        'description',
        'reference_number',
        'invoice_date',
        'due_date',
        'recurring',
        'frequency',
        'client_email',
        'client_phone',
        'payment_terms',
        'discount_applied',
        'discount_amount',
        'late_fee',
        'collection_status',
        'follow_up_date',
        'commission',
        'tax_category',
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
        'previous_balance',
        'current_balance',
        'source_description',
        'milestones_with_balances',
    ];

    /**
     * Resolves and formats client display name.
     * When both customer name and company name exist, returns "Customer Name (Company Name)".
     * When only customer name exists, returns "Customer Name".
     * When only company name exists, returns "Company Name".
     */
    public static function formatClientName(?string $clientInput): string
    {
        $input = trim((string) $clientInput);
        if ($input === '') {
            return '';
        }

        // Special system accounts
        if (in_array(strtolower($input), ['cash account', 'opening balance', 'general account'])) {
            return $input;
        }

        // Check if already in "Customer Name (Company Name)" format
        if (preg_match('/^(.+?)\s*\((.+?)\)$/', $input, $matches)) {
            $custName = trim($matches[1]);
            $compName = trim($matches[2]);
            $client = \App\Models\Client::where(function ($q) use ($custName, $compName) {
                $q->where('client_name', $custName)
                  ->orWhere('company_name', $compName)
                  ->orWhere('client_name', $compName)
                  ->orWhere('company_name', $custName);
            })->first();

            if ($client) {
                $cName = trim($client->client_name ?: $custName);
                $comp = trim($client->company_name ?: $compName);
                if ($cName !== '' && $comp !== '' && strcasecmp($cName, $comp) !== 0) {
                    return "{$cName} ({$comp})";
                }
                return $cName !== '' ? $cName : ($comp !== '' ? $comp : $input);
            }
            if ($custName !== '' && $compName !== '' && strcasecmp($custName, $compName) !== 0) {
                return "{$custName} ({$compName})";
            }
            return $custName !== '' ? $custName : ($compName !== '' ? $compName : $input);
        }

        // Look up in clients table by client_name or company_name
        $client = \App\Models\Client::where('client_name', $input)
            ->orWhere('company_name', $input)
            ->first();

        if ($client) {
            $custName = trim($client->client_name ?: '');
            $compName = trim($client->company_name ?: '');
            if ($custName !== '' && $compName !== '' && strcasecmp($custName, $compName) !== 0) {
                return "{$custName} ({$compName})";
            }
            return $custName !== '' ? $custName : ($compName !== '' ? $compName : $input);
        }

        return $input;
    }

    public function getClientAttribute($value): ?string
    {
        if ($value === null) {
            return null;
        }
        return self::formatClientName($value);
    }

    public function setClientAttribute($value): void
    {
        $this->attributes['client'] = $value !== null ? self::formatClientName($value) : null;
    }

    public function getPaidAmountAttribute(): float
    {
        return \App\Http\Controllers\IncomeController::calculateIncomePaid($this);
    }

    public function getOutstandingAmountAttribute(): float
    {
        $net = (float) ($this->net_amount ?? max(0.0, (float)$this->amount - (float)($this->discount_amount ?? 0) + (float)($this->gst_amount ?? 0)));
        $paid = $this->paid_amount;
        return round(max(0.0, $net - $paid), 2);
    }

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
                  ->where('related_type', Income::class);
            });
            $matched = true;
        }

        if ($this->inv_id) {
            $query->orWhere('inv_id', $this->inv_id);
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

        $isOB = $this->source === 'Opening Balance'
            || $this->category === 'Opening Balance'
            || ($this->reference_number && str_starts_with($this->reference_number, 'BANK-OB-'));

        $bankId = $this->bank_account_id ?: $this->initial_deposit_bank_id;
        if ($isOB && $bankId) {
            $query->orWhere(function ($q) use ($bankId) {
                $q->where('bank_account_id', $bankId)
                  ->where(function ($sub) use ($bankId) {
                      $sub->where('category', 'Opening Balance')
                          ->orWhere('reference_id', 'BANK-OB-' . $bankId)
                          ->orWhere('description', 'like', 'Opening balance%');
                  });
            });
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
                    'related_type' => Income::class,
                ]);
            }
            if ($res->previous_balance === null && $res->bank_account_id) {
                \App\Services\LedgerService::recalculateAccountLedger($res->bank_account_id);
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

    public function getSourceDescriptionAttribute(): string
    {
        return \App\Services\LedgerService::generateSourceBasedDescription(
            $this->source,
            $this->client,
            $this->reference_number ?: ($this->invoice_no ?: $this->transaction_id),
            $this->category,
            $this->notes
        );
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
            $ref = $inst['transaction_id'] ?? ('PAY-' . $this->id . '-' . ($idx + 1));
            $tx = $txMap->get($ref);
            $inst['previous_balance'] = $tx && $tx->previous_balance !== null ? (float)$tx->previous_balance : null;
            $inst['current_balance'] = $tx && $tx->current_balance !== null ? (float)$tx->current_balance : null;
            $milestones[] = $inst;
        }
        return $milestones;
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

    public function inv()
    {
        return $this->belongsTo(Inv::class);
    }
}
