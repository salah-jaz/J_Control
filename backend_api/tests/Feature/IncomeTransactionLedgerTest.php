<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Models\BankAccount;
use App\Models\Income;
use App\Models\Transaction;
use App\Models\Expense;
use App\Models\Inv;
use App\Services\LedgerService;

class IncomeTransactionLedgerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $user = \App\Models\User::factory()->create();
        $this->actingAs($user, 'sanctum');
    }

    /**
     * Scenario 1 — INV-generated income:
     * Correct source-based description, transaction amount, previous balance, and updated balance are displayed.
     */
    public function test_scenario_1_inv_generated_income(): void
    {
        $account = BankAccount::create([
            'bank_name' => 'Test Bank A',
            'account_name' => 'Corporate A',
            'account_type' => 'Current',
            'account_number' => 'ACC_A_001',
            'ifsc_code' => 'TEST0001',
            'opening_balance' => 1000.00,
            'current_balance' => 1000.00,
            'currency' => 'INR',
            'status' => 'Active',
        ]);

        // Creating an INV record triggers InvObserver
        $inv = Inv::create([
            'name' => 'John Doe',
            'jazno' => 'JAZ01',
            'amount' => 250.00,
            'bank_account_id' => $account->id,
            'date' => now()->toDateString(),
            'status' => 'Active',
        ]);

        $income = Income::where('inv_id', $inv->id)->first();
        $this->assertNotNull($income);
        $this->assertEquals('INV', $income->source);
        $this->assertEquals('John Doe', $income->client);
        $this->assertEquals(250.00, (float)$income->amount);
        $this->assertEquals(1000.00, (float)$income->previous_balance);
        $this->assertEquals(1250.00, (float)$income->current_balance);
        $this->assertEquals('INV payment for John Doe (Jazno: JAZ01)', $income->source_description);

        $tx = Transaction::where('inv_id', $inv->id)->first();
        $this->assertNotNull($tx);
        $this->assertEquals('INV payment for John Doe (Jazno: JAZ01)', $tx->description);
        $this->assertEquals(250.00, (float)$tx->amount);
        $this->assertEquals(1000.00, (float)$tx->previous_balance);
        $this->assertEquals(1250.00, (float)$tx->current_balance);

        $this->assertEquals(1250.00, (float)$account->fresh()->current_balance);
    }

    /**
     * Scenario 2 — Manual income:
     * Displays correct generated description and running balance without losing original user-entered description.
     */
    public function test_scenario_2_manual_income_preserves_user_description(): void
    {
        $account = BankAccount::create([
            'bank_name' => 'Test Bank B',
            'account_name' => 'Corporate B',
            'account_type' => 'Savings',
            'account_number' => 'ACC_B_001',
            'ifsc_code' => 'TEST0002',
            'opening_balance' => 1000.00,
            'current_balance' => 1000.00,
            'currency' => 'INR',
            'status' => 'Active',
        ]);

        $response = $this->postJson('/api/incomes', [
            'client' => 'Acme Corp',
            'source' => 'Consulting',
            'amount' => 500.00,
            'bank_account_id' => $account->id,
            'reference_number' => 'REF-55',
            'description' => 'Custom user remarks for Q3 consulting',
            'notes' => 'Internal note',
            'received_date' => now()->toDateString(),
        ]);

        $response->assertStatus(201);
        $incomeId = $response->json('id');
        $income = Income::with(['transactions', 'bankAccount'])->find($incomeId);

        // User data preserved
        $this->assertEquals('Custom user remarks for Q3 consulting', $income->description);
        $this->assertEquals('Internal note', $income->notes);

        // Source-based description generated
        $this->assertEquals('Consulting payment for Acme Corp (Ref: REF-55)', $income->source_description);
        $this->assertEquals(1000.00, (float)$income->previous_balance);
        $this->assertEquals(1500.00, (float)$income->current_balance);

        $tx = Transaction::where('related_id', $income->id)->where('related_type', Income::class)->first();
        $this->assertNotNull($tx);
        $this->assertEquals('Consulting payment for Acme Corp (Ref: REF-55)', $tx->description);
        $this->assertEquals(1000.00, (float)$tx->previous_balance);
        $this->assertEquals(1500.00, (float)$tx->current_balance);

        $this->assertEquals(1500.00, (float)$account->fresh()->current_balance);
    }

    /**
     * Scenario 3 — Multiple credits:
     * Each transaction shows correct balance before and after credit.
     */
    public function test_scenario_3_multiple_credits(): void
    {
        $account = BankAccount::create([
            'bank_name' => 'Test Bank C',
            'account_name' => 'Corporate C',
            'account_type' => 'Current',
            'account_number' => 'ACC_C_001',
            'ifsc_code' => 'TEST0003',
            'opening_balance' => 1000.00,
            'current_balance' => 1000.00,
            'currency' => 'INR',
            'status' => 'Active',
        ]);

        // Credit 1: 200
        $this->postJson('/api/incomes', [
            'client' => 'Client 1',
            'source' => 'Services',
            'amount' => 200.00,
            'bank_account_id' => $account->id,
            'reference_number' => 'CR-1',
            'received_date' => now()->toDateString(),
        ]);

        // Credit 2: 300
        $this->postJson('/api/incomes', [
            'client' => 'Client 2',
            'source' => 'Services',
            'amount' => 300.00,
            'bank_account_id' => $account->id,
            'reference_number' => 'CR-2',
            'received_date' => now()->toDateString(),
        ]);

        $txns = Transaction::where('bank_account_id', $account->id)
            ->orderBy('id', 'asc')
            ->get();

        // 1. Opening Balance: 0 -> 1000
        $this->assertEquals(0.00, (float)$txns[0]->previous_balance);
        $this->assertEquals(1000.00, (float)$txns[0]->current_balance);

        // 2. Credit 1: 1000 -> 1200
        $this->assertEquals(1000.00, (float)$txns[1]->previous_balance);
        $this->assertEquals(1200.00, (float)$txns[1]->current_balance);

        // 3. Credit 2: 1200 -> 1500
        $this->assertEquals(1200.00, (float)$txns[2]->previous_balance);
        $this->assertEquals(1500.00, (float)$txns[2]->current_balance);

        $this->assertEquals(1500.00, (float)$account->fresh()->current_balance);
    }

    /**
     * Scenario 4 — Debit and credit combinations:
     * Previous and updated balances remain mathematically correct.
     */
    public function test_scenario_4_debit_and_credit_combinations(): void
    {
        $account = BankAccount::create([
            'bank_name' => 'Test Bank D',
            'account_name' => 'Corporate D',
            'account_type' => 'Current',
            'account_number' => 'ACC_D_001',
            'ifsc_code' => 'TEST0004',
            'opening_balance' => 1000.00,
            'current_balance' => 1000.00,
            'currency' => 'INR',
            'status' => 'Active',
        ]);

        // 1. Credit 500 -> 1500
        Transaction::create([
            'type' => 'Income',
            'date' => now()->toDateString(),
            'amount' => 500.00,
            'bank_account_id' => $account->id,
            'reference_id' => 'CR-500',
            'description' => 'Credit of 500',
            'status' => 'Received',
        ]);

        // 2. Debit 400 (Expense) -> 1100
        Transaction::create([
            'type' => 'Expense',
            'date' => now()->toDateString(),
            'amount' => 400.00,
            'bank_account_id' => $account->id,
            'reference_id' => 'DR-400',
            'description' => 'Debit of 400',
            'status' => 'Paid',
        ]);

        // 3. Credit 200 -> 1300
        Transaction::create([
            'type' => 'Income',
            'date' => now()->toDateString(),
            'amount' => 200.00,
            'bank_account_id' => $account->id,
            'reference_id' => 'CR-200',
            'description' => 'Credit of 200',
            'status' => 'Received',
        ]);

        $txns = Transaction::where('bank_account_id', $account->id)
            ->orderBy('id', 'asc')
            ->get();

        // OB: 0 -> 1000
        $this->assertEquals(0.00, (float)$txns[0]->previous_balance);
        $this->assertEquals(1000.00, (float)$txns[0]->current_balance);

        // Credit 500: 1000 -> 1500
        $this->assertEquals(1000.00, (float)$txns[1]->previous_balance);
        $this->assertEquals(1500.00, (float)$txns[1]->current_balance);

        // Debit 400: 1500 -> 1100
        $this->assertEquals(1500.00, (float)$txns[2]->previous_balance);
        $this->assertEquals(1100.00, (float)$txns[2]->current_balance);

        // Credit 200: 1100 -> 1300
        $this->assertEquals(1100.00, (float)$txns[3]->previous_balance);
        $this->assertEquals(1300.00, (float)$txns[3]->current_balance);

        $this->assertEquals(1300.00, (float)$account->fresh()->current_balance);
    }

    /**
     * Scenario 5 — Multiple bank accounts:
     * Each transaction uses the correct account-specific balance.
     */
    public function test_scenario_5_multiple_bank_accounts(): void
    {
        $account1 = BankAccount::create([
            'bank_name' => 'Bank One',
            'account_name' => 'Account 1',
            'account_type' => 'Current',
            'account_number' => 'ACC_MULTI_1',
            'ifsc_code' => 'M001',
            'opening_balance' => 2000.00,
            'current_balance' => 2000.00,
            'currency' => 'INR',
            'status' => 'Active',
        ]);

        $account2 = BankAccount::create([
            'bank_name' => 'Bank Two',
            'account_name' => 'Account 2',
            'account_type' => 'Savings',
            'account_number' => 'ACC_MULTI_2',
            'ifsc_code' => 'M002',
            'opening_balance' => 8000.00,
            'current_balance' => 8000.00,
            'currency' => 'INR',
            'status' => 'Active',
        ]);

        // Credit on Account 1: 500
        $this->postJson('/api/incomes', [
            'client' => 'Client A',
            'source' => 'Sales',
            'amount' => 500.00,
            'bank_account_id' => $account1->id,
            'received_date' => now()->toDateString(),
        ]);

        // Credit on Account 2: 1500
        $this->postJson('/api/incomes', [
            'client' => 'Client B',
            'source' => 'Sales',
            'amount' => 1500.00,
            'bank_account_id' => $account2->id,
            'received_date' => now()->toDateString(),
        ]);

        // Account 1 should be 2000 + 500 = 2500
        $this->assertEquals(2500.00, (float)$account1->fresh()->current_balance);

        // Account 2 should be 8000 + 1500 = 9500
        $this->assertEquals(9500.00, (float)$account2->fresh()->current_balance);

        $tx1 = Transaction::where('bank_account_id', $account1->id)->where('amount', 500.00)->first();
        $this->assertEquals(2000.00, (float)$tx1->previous_balance);
        $this->assertEquals(2500.00, (float)$tx1->current_balance);

        $tx2 = Transaction::where('bank_account_id', $account2->id)->where('amount', 1500.00)->first();
        $this->assertEquals(8000.00, (float)$tx2->previous_balance);
        $this->assertEquals(9500.00, (float)$tx2->current_balance);
    }

    /**
     * Scenario 6 — Historical records:
     * Unreconstructable records (no bank account) have null balance, not fabricated.
     */
    public function test_scenario_6_historical_records_null_when_unreconstructable(): void
    {
        $tx = Transaction::create([
            'type' => 'Income',
            'date' => '2025-01-01',
            'amount' => 350.00,
            'bank_account_id' => null,
            'reference_id' => 'LEGACY-001',
            'description' => 'Legacy transaction without bank',
            'status' => 'Received',
        ]);

        $this->assertNull($tx->previous_balance);
        $this->assertNull($tx->current_balance);

        $response = $this->getJson("/api/transactions");
        $response->assertStatus(200);

        $found = collect($response->json('data'))->firstWhere('id', $tx->id);
        $this->assertNotNull($found);
        $this->assertNull($found['previousBalance']);
        $this->assertNull($found['currentBalance']);
    }

    /**
     * Scenario 7 — API Endpoints synchronization and regression:
     * Check consistency between Transactions and Incomes API.
     */
    public function test_scenario_7_api_synchronization_and_details(): void
    {
        $account = BankAccount::create([
            'bank_name' => 'HDFC Bank',
            'account_name' => 'Corporate Main',
            'account_type' => 'Current',
            'account_number' => 'HDFC_999',
            'ifsc_code' => 'HDFC0000999',
            'opening_balance' => 5000.00,
            'current_balance' => 5000.00,
            'currency' => 'INR',
            'status' => 'Active',
        ]);

        $postRes = $this->postJson('/api/incomes', [
            'client' => 'Global Logistics',
            'source' => 'Freight',
            'amount' => 1200.00,
            'bank_account_id' => $account->id,
            'reference_number' => 'FL-888',
            'description' => 'Sea freight clearance charge',
            'notes' => 'Invoice paid via wire transfer',
            'received_date' => now()->toDateString(),
        ]);

        $postRes->assertStatus(201);
        $incomeId = $postRes->json('id');

        // Check Income index
        $incomeListRes = $this->getJson('/api/incomes');
        $incomeListRes->assertStatus(200);
        $incomeItem = collect($incomeListRes->json('data'))->firstWhere('id', $incomeId);

        $this->assertEquals(5000.00, (float)$incomeItem['previous_balance']);
        $this->assertEquals(6200.00, (float)$incomeItem['current_balance']);
        $this->assertEquals('Freight payment for Global Logistics (Ref: FL-888)', $incomeItem['source_description']);
        $this->assertEquals('Sea freight clearance charge', $incomeItem['description']);

        // Check Transactions index
        $txnListRes = $this->getJson('/api/transactions');
        $txnListRes->assertStatus(200);
        $txnItem = collect($txnListRes->json('data'))->firstWhere('relatedId', $incomeId);

        $this->assertEquals(5000.00, (float)$txnItem['previousBalance']);
        $this->assertEquals(6200.00, (float)$txnItem['currentBalance']);
        $this->assertEquals('Freight payment for Global Logistics (Ref: FL-888)', $txnItem['description']);
        $this->assertEquals('Sea freight clearance charge', $txnItem['userDescription']);
        $this->assertEquals('Global Logistics', $txnItem['party']);
        $this->assertEquals(1200.00, (float)$txnItem['amount']);
        $this->assertEquals('FL-888', $txnItem['reference']);

        // Check single Income detail endpoint
        $incomeShowRes = $this->getJson("/api/incomes/{$incomeId}");
        $incomeShowRes->assertStatus(200);
        $this->assertEquals(5000.00, (float)$incomeShowRes->json('previous_balance'));
        $this->assertEquals(6200.00, (float)$incomeShowRes->json('current_balance'));
        $this->assertNotEmpty($incomeShowRes->json('transactions'));
        $this->assertEquals(5000.00, (float)$incomeShowRes->json('transactions.0.previous_balance'));
        $this->assertEquals(6200.00, (float)$incomeShowRes->json('transactions.0.current_balance'));
    }

    /**
     * Scenario 8 — Cash Account income previous and current balance accuracy:
     */
    public function test_scenario_8_cash_account_income_balance_resolution(): void
    {
        $cashAcc = BankAccount::ensureDefaultCashAccount();
        $cashAcc->update(['opening_balance' => 300.00, 'current_balance' => 300.00]);
        LedgerService::recalculateAccountLedger($cashAcc->id);

        $postRes = $this->postJson('/api/incomes', [
            'client' => 'Walk-in Cash Client',
            'source' => 'Direct Sales',
            'amount' => 150.00,
            'method' => 'Cash',
            'bank_account_id' => $cashAcc->id,
            'reference_number' => 'CASH-991',
            'received_date' => now()->toDateString(),
        ]);
        $postRes->assertStatus(201);
        $incomeId = $postRes->json('id');

        $incomeShow = $this->getJson("/api/incomes/{$incomeId}");
        $incomeShow->assertStatus(200);
        $this->assertEquals(300.00, (float)$incomeShow->json('previous_balance'));
        $this->assertEquals(450.00, (float)$incomeShow->json('current_balance'));

        $txRes = $this->getJson("/api/transactions");
        $txItem = collect($txRes->json('data'))->firstWhere('relatedId', $incomeId);
        $this->assertNotNull($txItem);
        $this->assertEquals(300.00, (float)$txItem['previousBalance']);
        $this->assertEquals(450.00, (float)$txItem['currentBalance']);
        $this->assertEquals('Cash Account', $txItem['bank']);
    }

    /**
     * Scenario 9 — Fallback resolution when related_id was unlinked:
     */
    public function test_scenario_9_unlinked_transaction_fallback_resolution(): void
    {
        $account = BankAccount::create([
            'bank_name' => 'Axis Bank',
            'account_name' => 'Axis Main',
            'account_type' => 'Current',
            'account_number' => 'AXIS_777',
            'ifsc_code' => 'UTIB0000777',
            'opening_balance' => 1000.00,
            'current_balance' => 1000.00,
            'currency' => 'INR',
            'status' => 'Active',
        ]);

        $income = Income::create([
            'client' => 'Offline Client',
            'source' => 'Consulting',
            'amount' => 400.00,
            'method' => 'Bank Transfer',
            'bank_account_id' => $account->id,
            'transaction_id' => 'UNLINKED-TXN-101',
            'status' => 'Received',
        ]);

        // Transaction created separately without related_id/related_type
        $tx = Transaction::create([
            'type' => 'Income',
            'date' => now()->toDateString(),
            'amount' => 400.00,
            'currency' => 'INR',
            'category' => 'Consulting',
            'method' => 'Bank Transfer',
            'bank_account_id' => $account->id,
            'reference_id' => 'UNLINKED-TXN-101',
            'description' => 'Consulting payment for Offline Client',
            'status' => 'Received',
        ]);

        // Before viewing, verify income resolves balances via fallback
        $this->assertEquals(1000.00, (float)$income->previous_balance);
        $this->assertEquals(1400.00, (float)$income->current_balance);

        $showRes = $this->getJson("/api/incomes/{$income->id}");
        $showRes->assertStatus(200);
        $this->assertEquals(1000.00, (float)$showRes->json('previous_balance'));
        $this->assertEquals(1400.00, (float)$showRes->json('current_balance'));
    }
}
