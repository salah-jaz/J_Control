<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Models\BankAccount;
use App\Models\Expense;
use App\Models\Transaction;
use App\Services\LedgerService;

class ExpenseTransactionLedgerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $user = \App\Models\User::factory()->create();
        $this->actingAs($user, 'sanctum');
    }

    /**
     * Test creating a single-payment expense:
     * Debits the bank account, creates transaction, sets running balances correctly.
     */
    public function test_create_single_payment_expense(): void
    {
        $account = BankAccount::create([
            'bank_name' => 'HDFC Bank',
            'account_name' => 'Main Operational',
            'account_type' => 'Current',
            'account_number' => 'HDFC-001',
            'ifsc_code' => 'HDFC0001',
            'opening_balance' => 5000.00,
            'current_balance' => 5000.00,
            'currency' => 'INR',
            'status' => 'Active',
        ]);

        $response = $this->postJson('/api/expenses', [
            'vendor' => 'Office Depot',
            'expense_type' => 'Stationery',
            'category' => 'Office Supplies',
            'amount' => 500.00,
            'method' => 'Bank Account',
            'bank_account_id' => $account->id,
            'paid_date' => now()->toDateString(),
            'description' => 'Office stationery for Q1',
            'itc_eligible' => 'No',
        ]);

        $response->assertStatus(201);
        $expenseId = $response->json('id');
        $this->assertNotNull($expenseId);

        $expense = Expense::with(['bankAccount', 'transactions'])->find($expenseId);
        $this->assertNotNull($expense);
        $this->assertEquals(500.00, (float)$expense->amount);
        $this->assertEquals(500.00, (float)$expense->paid_amount);
        $this->assertEquals(0.00, (float)$expense->outstanding_amount);
        $this->assertEquals('Fully Paid', $expense->status);
        $this->assertEquals('No', $expense->itc_eligible);

        // Verify transaction
        $this->assertCount(1, $expense->transactions);
        $tx = $expense->transactions->first();
        $this->assertEquals(500.00, (float)$tx->amount);
        $this->assertEquals('Expense', $tx->type);
        $this->assertEquals(5000.00, (float)$tx->previous_balance);
        $this->assertEquals(4500.00, (float)$tx->current_balance);

        // Verify bank account balance was debited
        $this->assertEquals(4500.00, (float)$account->fresh()->current_balance);

        // Verify expense accessors
        $this->assertEquals(5000.00, (float)$expense->previous_balance);
        $this->assertEquals(4500.00, (float)$expense->current_balance);
    }

    /**
     * Test viewing expense details (GET /api/expenses/{id}):
     * Returns full model with bankAccount, transactions, balances, paid, outstanding.
     */
    public function test_view_expense_details(): void
    {
        $account = BankAccount::create([
            'bank_name' => 'Axis Bank',
            'account_name' => 'Primary Current',
            'account_type' => 'Current',
            'account_number' => 'AXIS-002',
            'ifsc_code' => 'UTIB0002',
            'opening_balance' => 10000.00,
            'current_balance' => 10000.00,
            'currency' => 'INR',
            'status' => 'Active',
        ]);

        $createRes = $this->postJson('/api/expenses', [
            'vendor' => 'Cloud Provider AWS',
            'expense_type' => 'Cloud Hosting',
            'category' => 'Infrastructure',
            'amount' => 1200.00,
            'method' => 'Bank Account',
            'bank_account_id' => $account->id,
            'paid_date' => now()->toDateString(),
            'notes' => 'Monthly AWS servers',
            'description' => 'EC2 and RDS instances',
            'itc_eligible' => 'Yes',
        ]);
        $createRes->assertStatus(201);
        $expenseId = $createRes->json('id');

        $response = $this->getJson("/api/expenses/{$expenseId}");
        $response->assertStatus(200);

        $data = $response->json();
        $this->assertEquals('Cloud Provider AWS', $data['vendor']);
        $this->assertEquals(1200.00, (float)$data['amount']);
        $this->assertEquals(1200.00, (float)$data['paid_amount']);
        $this->assertEquals(0.00, (float)$data['outstanding_amount']);
        $this->assertEquals('Yes', $data['itc_eligible']);
        $this->assertEquals(10000.00, (float)$data['previous_balance']);
        $this->assertEquals(8800.00, (float)$data['current_balance']);
        $this->assertNotEmpty($data['transactions']);
        $this->assertEquals(1200.00, (float)$data['transactions'][0]['amount']);
        $this->assertEquals(10000.00, (float)$data['transactions'][0]['previous_balance']);
        $this->assertEquals(8800.00, (float)$data['transactions'][0]['current_balance']);
        $this->assertEquals('Expense payment for Cloud Provider AWS - Cloud Hosting', $data['source_description']);
    }

    /**
     * Test updating expense amount:
     * - Must not fail with SQL error: Column 'itc_eligible' cannot be null
     * - Must adjust bank balance by difference
     * - Must update transaction in place without creating duplicates
     * - Must recalculate running ledger balances
     */
    public function test_update_expense_amount_resolves_itc_eligible_and_updates_ledger(): void
    {
        $account = BankAccount::create([
            'bank_name' => 'ICICI Bank',
            'account_name' => 'Corp Account',
            'account_type' => 'Current',
            'account_number' => 'ICICI-003',
            'ifsc_code' => 'ICIC0003',
            'opening_balance' => 8000.00,
            'current_balance' => 8000.00,
            'currency' => 'INR',
            'status' => 'Active',
        ]);

        $createRes = $this->postJson('/api/expenses', [
            'vendor' => 'Furniture World',
            'expense_type' => 'Office Desks',
            'category' => 'Assets',
            'amount' => 2000.00,
            'method' => 'Bank Account',
            'bank_account_id' => $account->id,
            'paid_date' => now()->toDateString(),
            'notes' => 'Original note',
            'itc_eligible' => 'No',
        ]);
        $createRes->assertStatus(201);
        $expenseId = $createRes->json('id');
        $this->assertEquals(6000.00, (float)$account->fresh()->current_balance);

        // Update with changed amount to 3000.00 and itc_eligible as NULL (simulating frontend sending clean(undefined))
        $updateRes = $this->putJson("/api/expenses/{$expenseId}", [
            'vendor' => 'Furniture World',
            'expense_type' => 'Office Desks',
            'category' => 'Assets',
            'amount' => 3000.00,
            'method' => 'Bank Account',
            'bank_account_id' => $account->id,
            'paid_date' => now()->toDateString(),
            'notes' => 'Updated note with additional chairs',
            'itc_eligible' => null, // This previously caused SQL 1048 Column 'itc_eligible' cannot be null
        ]);

        $updateRes->assertStatus(200);

        $expense = Expense::with(['bankAccount', 'transactions'])->find($expenseId);
        $this->assertEquals(3000.00, (float)$expense->amount);
        $this->assertEquals(3000.00, (float)$expense->net_amount);
        $this->assertEquals(3000.00, (float)$expense->paid_amount);
        $this->assertEquals(0.00, (float)$expense->outstanding_amount);
        $this->assertEquals('Fully Paid', $expense->status);
        // itc_eligible preserved / defaulted properly
        $this->assertEquals('No', $expense->itc_eligible);

        // Ensure exactly ONE transaction exists (no duplicates created!)
        $this->assertEquals(1, Transaction::where('related_id', $expense->id)->where('related_type', Expense::class)->count());

        $tx = $expense->transactions()->first();
        $this->assertEquals(3000.00, (float)$tx->amount);
        $this->assertEquals(8000.00, (float)$tx->previous_balance);
        $this->assertEquals(5000.00, (float)$tx->current_balance);

        // Bank balance debited for the additional 1000 (8000 - 3000 = 5000)
        $this->assertEquals(5000.00, (float)$account->fresh()->current_balance);
    }

    /**
     * Test updating expense with changed bank account:
     * Old bank is refunded, new bank is debited, ledger balances recalculated on both accounts.
     */
    public function test_update_expense_switch_bank_account(): void
    {
        $bankA = BankAccount::create([
            'bank_name' => 'Bank A',
            'account_name' => 'Corp A',
            'account_type' => 'Current',
            'account_number' => 'BANK-A-01',
            'ifsc_code' => 'BKNA0001',
            'opening_balance' => 5000.00,
            'current_balance' => 5000.00,
            'currency' => 'INR',
            'status' => 'Active',
        ]);

        $bankB = BankAccount::create([
            'bank_name' => 'Bank B',
            'account_name' => 'Corp B',
            'account_type' => 'Current',
            'account_number' => 'BANK-B-01',
            'ifsc_code' => 'BKNB0001',
            'opening_balance' => 10000.00,
            'current_balance' => 10000.00,
            'currency' => 'INR',
            'status' => 'Active',
        ]);

        $createRes = $this->postJson('/api/expenses', [
            'vendor' => 'Software Corp',
            'expense_type' => 'License',
            'amount' => 1000.00,
            'method' => 'Bank Account',
            'bank_account_id' => $bankA->id,
            'paid_date' => now()->toDateString(),
        ]);
        $createRes->assertStatus(201);
        $expenseId = $createRes->json('id');

        $this->assertEquals(4000.00, (float)$bankA->fresh()->current_balance);
        $this->assertEquals(10000.00, (float)$bankB->fresh()->current_balance);

        // Switch expense to Bank B and change amount to 1500
        $updateRes = $this->putJson("/api/expenses/{$expenseId}", [
            'vendor' => 'Software Corp',
            'expense_type' => 'License',
            'amount' => 1500.00,
            'method' => 'Bank Account',
            'bank_account_id' => $bankB->id,
            'paid_date' => now()->toDateString(),
            'itc_eligible' => 'Yes',
        ]);
        $updateRes->assertStatus(200);

        // Bank A should be refunded back to 5000
        $this->assertEquals(5000.00, (float)$bankA->fresh()->current_balance);
        // Bank B should be debited by 1500 (10000 - 1500 = 8500)
        $this->assertEquals(8500.00, (float)$bankB->fresh()->current_balance);

        $expense = Expense::find($expenseId);
        $this->assertEquals('Yes', $expense->itc_eligible);
        $this->assertEquals(1500.00, (float)$expense->amount);

        // Verify transaction is moved to Bank B with proper running balance
        $tx = Transaction::where('related_id', $expenseId)->where('related_type', Expense::class)->first();
        $this->assertEquals($bankB->id, $tx->bank_account_id);
        $this->assertEquals(1500.00, (float)$tx->amount);
        $this->assertEquals(10000.00, (float)$tx->previous_balance);
        $this->assertEquals(8500.00, (float)$tx->current_balance);
    }

    /**
     * Test split payments milestone expense creation and updates.
     */
    public function test_split_payment_milestones_and_updates(): void
    {
        $account = BankAccount::create([
            'bank_name' => 'Kotak Bank',
            'account_name' => 'Operating Kotak',
            'account_type' => 'Current',
            'account_number' => 'KOTAK-001',
            'ifsc_code' => 'KKBK0001',
            'opening_balance' => 20000.00,
            'current_balance' => 20000.00,
            'currency' => 'INR',
            'status' => 'Active',
        ]);

        // Create expense with 2 installments: 4000 Paid, 6000 Pending
        $createRes = $this->postJson('/api/expenses', [
            'vendor' => 'Contractor Builder',
            'expense_type' => 'Renovation',
            'category' => 'Repairs',
            'amount' => 10000.00,
            'method' => 'Bank Account',
            'payment_terms' => 'Split Payment',
            'extra_installments' => [
                [
                    'amount' => 4000.00,
                    'status' => 'Paid',
                    'date' => now()->toDateString(),
                    'method' => 'Bank Account',
                    'bank_account_id' => $account->id,
                ],
                [
                    'amount' => 6000.00,
                    'status' => 'Pending',
                    'date' => now()->addDays(30)->toDateString(),
                    'method' => 'Bank Account',
                    'bank_account_id' => $account->id,
                ],
            ],
            'itc_eligible' => 'No',
        ]);

        $createRes->assertStatus(201);
        $expenseId = $createRes->json('id');

        $expense = Expense::with(['bankAccount', 'transactions'])->find($expenseId);
        $this->assertEquals(10000.00, (float)$expense->amount);
        $this->assertEquals(4000.00, (float)$expense->paid_amount);
        $this->assertEquals(6000.00, (float)$expense->outstanding_amount);
        $this->assertEquals('Partially Paid', $expense->status);

        // Only 1 transaction created for the Paid milestone (4000)
        $this->assertEquals(1, $expense->transactions()->count());
        $this->assertEquals(16000.00, (float)$account->fresh()->current_balance);

        // Update the expense: adjust the second milestone from 6000 to 5000 (total 9000)
        $updateRes = $this->putJson("/api/expenses/{$expenseId}", [
            'vendor' => 'Contractor Builder',
            'expense_type' => 'Renovation',
            'category' => 'Repairs',
            'amount' => 9000.00,
            'method' => 'Bank Account',
            'payment_terms' => 'Split Payment',
            'extra_installments' => [
                [
                    'amount' => 4000.00,
                    'status' => 'Paid',
                    'date' => now()->toDateString(),
                    'method' => 'Bank Account',
                    'bank_account_id' => $account->id,
                ],
                [
                    'amount' => 5000.00,
                    'status' => 'Pending',
                    'date' => now()->addDays(30)->toDateString(),
                    'method' => 'Bank Account',
                    'bank_account_id' => $account->id,
                ],
            ],
            'itc_eligible' => null, // Test itc_eligible null handling on split payment update
        ]);

        $updateRes->assertStatus(200);

        $freshExpense = Expense::find($expenseId);
        $this->assertEquals(9000.00, (float)$freshExpense->amount);
        $this->assertEquals(4000.00, (float)$freshExpense->paid_amount);
        $this->assertEquals(5000.00, (float)$freshExpense->outstanding_amount);
        $this->assertEquals('Partially Paid', $freshExpense->status);
        $this->assertEquals('No', $freshExpense->itc_eligible);

        // Now record payment for milestone #2 via recordPayment
        $payRes = $this->postJson("/api/expenses/{$expenseId}/record-payment", [
            'amount' => 5000.00,
            'installment_index' => 1,
            'bank_account_id' => $account->id,
            'payment_date' => now()->toDateString(),
        ]);
        $payRes->assertStatus(200);

        $fullyPaidExpense = Expense::find($expenseId);
        $this->assertEquals(9000.00, (float)$fullyPaidExpense->paid_amount);
        $this->assertEquals(0.00, (float)$fullyPaidExpense->outstanding_amount);
        $this->assertEquals('Fully Paid', $fullyPaidExpense->status);

        // Now exactly 2 transactions exist
        $this->assertEquals(2, Transaction::where('related_id', $expenseId)->where('related_type', Expense::class)->count());
        // Bank account debited by 4000 + 5000 = 9000 (20000 - 9000 = 11000)
        $this->assertEquals(11000.00, (float)$account->fresh()->current_balance);
    }

    /**
     * Test source_description in various scenarios:
     * 1. From linked transaction description
     * 2. From expense description when no transaction
     * 3. Fallback generated description when no description/notes
     */
    public function test_expense_source_description_various_scenarios(): void
    {
        // 1. Unpaid expense with user description (no transactions)
        $expense1 = Expense::create([
            'vendor' => 'Dell Technologies',
            'expense_type' => 'Hardware Purchase',
            'category' => 'Equipment',
            'amount' => 55000.00,
            'method' => 'Bank Account',
            'bill_no' => 'DELL-2026-99',
            'status' => 'Pending',
            'description' => 'Developer Workstation Dell Precision',
            'itc_eligible' => 'No',
        ]);
        $this->assertEquals('Expense payment for Dell Technologies - Hardware Purchase', $expense1->source_description);

        // 2. Unpaid expense with no description or notes (fallback formatting)
        $expense2 = Expense::create([
            'vendor' => 'Starlink Internet',
            'expense_type' => 'Internet Services',
            'category' => 'Utilities',
            'amount' => 6000.00,
            'method' => 'Bank Account',
            'bill_no' => 'SL-8841',
            'status' => 'Pending',
            'itc_eligible' => 'No',
        ]);
        $this->assertEquals('Expense payment for Starlink Internet - Internet Services', $expense2->source_description);

        // 3. Paid expense with linked transaction description
        $account = BankAccount::create([
            'bank_name' => 'SBI Bank',
            'account_name' => 'Current SBI',
            'account_type' => 'Current',
            'account_number' => 'SBI-777',
            'ifsc_code' => 'SBIN000777',
            'opening_balance' => 50000.00,
            'current_balance' => 50000.00,
            'currency' => 'INR',
            'status' => 'Active',
        ]);

        $res = $this->postJson('/api/expenses', [
            'vendor' => 'Microsoft Azure',
            'expense_type' => 'Cloud Services',
            'amount' => 3500.00,
            'method' => 'Bank Account',
            'bank_account_id' => $account->id,
            'paid_date' => now()->toDateString(),
            'notes' => 'Azure VM compute charges',
            'description' => 'Internal Cloud Budget',
            'itc_eligible' => 'No',
        ]);
        $res->assertStatus(201);
        $data = $res->json();
        $this->assertEquals('Expense payment for Microsoft Azure - Cloud Services', $data['source_description']);
    }

    /**
     * Test Expense Title / Type and Vendor description mapping:
     * Vendor: salah, Expense Title / Type: water -> "Expense payment for salah - water"
     * Both Expense detail view and Transaction detail view display this description.
     */
    public function test_expense_title_and_vendor_description_mapping(): void
    {
        $account = BankAccount::create([
            'bank_name' => 'Kotak Bank',
            'account_name' => 'Kotak Current',
            'account_type' => 'Current',
            'account_number' => 'KOTAK-999',
            'ifsc_code' => 'KKBK0000999',
            'opening_balance' => 25000.00,
            'current_balance' => 25000.00,
            'currency' => 'INR',
            'status' => 'Active',
        ]);

        // 1. Create expense with vendor "salah" and expense_type "water"
        $createRes = $this->postJson('/api/expenses', [
            'vendor' => 'salah',
            'expense_type' => 'water',
            'category' => 'Utilities',
            'amount' => 1500.00,
            'method' => 'Bank Account',
            'bank_account_id' => $account->id,
            'paid_date' => now()->toDateString(),
            'notes' => 'Internal water dispenser refill notes',
            'itc_eligible' => 'No',
        ]);

        $createRes->assertStatus(201);
        $expenseId = $createRes->json('id');
        $this->assertNotNull($expenseId);

        // 2. Verify Expense View (GET /api/expenses/{id}) displays "Expense payment for salah - water"
        $expRes = $this->getJson("/api/expenses/{$expenseId}");
        $expRes->assertStatus(200);
        $expData = $expRes->json();
        $this->assertEquals('Expense payment for salah - water', $expData['source_description']);
        $this->assertEquals('Internal water dispenser refill notes', $expData['notes']);

        // 3. Verify Transaction record and Transaction View (GET /api/transactions/{id})
        $tx = Transaction::where('related_id', $expenseId)->where('related_type', Expense::class)->first();
        $this->assertNotNull($tx);
        $this->assertEquals('Expense payment for salah - water', $tx->description);

        $txnRes = $this->getJson("/api/transactions/{$tx->id}");
        $txnRes->assertStatus(200);
        $txnData = $txnRes->json();
        $this->assertEquals('Expense payment for salah - water', $txnData['description']);
        $this->assertEquals('salah', $txnData['party']);
        $this->assertEquals('Internal water dispenser refill notes', $txnData['userDescription']);

        // Ledger balances correctly preserved
        $this->assertEquals(25000.00, (float)$txnData['previous_balance']);
        $this->assertEquals(23500.00, (float)$txnData['current_balance']);
        $this->assertEquals(23500.00, (float)$account->fresh()->current_balance);
    }

    /**
     * Test editing Expense Title / Type updates linked description consistently:
     * Editing "water" to "mineral water" updates linked transaction description
     * without creating duplicate transactions or changing payment records.
     */
    public function test_edit_expense_title_updates_linked_transaction_description(): void
    {
        $account = BankAccount::create([
            'bank_name' => 'ICICI Bank',
            'account_name' => 'ICICI Current',
            'account_type' => 'Current',
            'account_number' => 'ICICI-333',
            'ifsc_code' => 'ICIC0000333',
            'opening_balance' => 30000.00,
            'current_balance' => 30000.00,
            'currency' => 'INR',
            'status' => 'Active',
        ]);

        $createRes = $this->postJson('/api/expenses', [
            'vendor' => 'salah',
            'expense_type' => 'water',
            'category' => 'Utilities',
            'amount' => 2000.00,
            'method' => 'Bank Account',
            'bank_account_id' => $account->id,
            'paid_date' => now()->toDateString(),
            'itc_eligible' => 'No',
        ]);
        $createRes->assertStatus(201);
        $expenseId = $createRes->json('id');

        // Edit Expense Title / Type from "water" to "mineral water"
        $updateRes = $this->putJson("/api/expenses/{$expenseId}", [
            'vendor' => 'salah',
            'expense_type' => 'mineral water',
            'category' => 'Utilities',
            'amount' => 2000.00,
            'method' => 'Bank Account',
            'bank_account_id' => $account->id,
            'paid_date' => now()->toDateString(),
            'itc_eligible' => 'No',
        ]);
        $updateRes->assertStatus(200);

        // Expense View has updated description
        $expRes = $this->getJson("/api/expenses/{$expenseId}");
        $this->assertEquals('Expense payment for salah - mineral water', $expRes->json('source_description'));

        // Exactly 1 transaction exists (no duplicates)
        $txCount = Transaction::where('related_id', $expenseId)->where('related_type', Expense::class)->count();
        $this->assertEquals(1, $txCount);

        // Transaction View has updated description
        $tx = Transaction::where('related_id', $expenseId)->where('related_type', Expense::class)->first();
        $this->assertEquals('Expense payment for salah - mineral water', $tx->description);

        $txnRes = $this->getJson("/api/transactions/{$tx->id}");
        $this->assertEquals('Expense payment for salah - mineral water', $txnRes->json('description'));

        // Ledger balances and payment records remain intact
        $this->assertEquals(30000.00, (float)$tx->previous_balance);
        $this->assertEquals(28000.00, (float)$tx->current_balance);
        $this->assertEquals(28000.00, (float)$account->fresh()->current_balance);
    }

    /**
     * Test legacy applicable records that had "Expense payment for salah"
     * automatically resolve and display the complete description with title.
     */
    public function test_legacy_applicable_records_heal_and_display_title(): void
    {
        $account = BankAccount::create([
            'bank_name' => 'Canara Bank',
            'account_name' => 'Canara Current',
            'account_type' => 'Current',
            'account_number' => 'CNRB-444',
            'ifsc_code' => 'CNRB0000444',
            'opening_balance' => 15000.00,
            'current_balance' => 14000.00,
            'currency' => 'INR',
            'status' => 'Active',
        ]);

        $expense = Expense::create([
            'vendor' => 'salah',
            'expense_type' => 'water',
            'category' => 'Utilities',
            'amount' => 1000.00,
            'initial_deposit_amount' => 1000.00,
            'method' => 'Bank Account',
            'bank_account_id' => $account->id,
            'paid_date' => now()->toDateString(),
            'status' => 'Fully Paid',
            'itc_eligible' => 'No',
        ]);

        // Simulate legacy transaction created before the fix that omitted the title
        $tx = Transaction::create([
            'type' => 'Expense',
            'date' => now()->toDateString(),
            'amount' => 1000.00,
            'currency' => 'INR',
            'category' => 'Utilities',
            'method' => 'Bank Account',
            'bank_account_id' => $account->id,
            'reference_id' => 'EXP-LEGACY-01',
            'description' => 'Expense payment for salah', // legacy description omitting title
            'status' => 'Completed',
            'related_id' => $expense->id,
            'related_type' => Expense::class,
            'previous_balance' => 15000.00,
            'current_balance' => 14000.00,
        ]);

        // 1. Expense Detail View resolves complete description
        $expRes = $this->getJson("/api/expenses/{$expense->id}");
        $this->assertEquals('Expense payment for salah - water', $expRes->json('source_description'));

        // 2. Transaction Detail View resolves complete description and heals DB record
        $txnRes = $this->getJson("/api/transactions/{$tx->id}");
        $this->assertEquals('Expense payment for salah - water', $txnRes->json('description'));
        $this->assertEquals('Expense payment for salah - water', $tx->fresh()->description);
    }

    /**
     * Test graceful handling of missing titles and special values:
     * - No title -> "Expense payment for {vendor}" (no undefined, null, or trailing dash)
     * - Literal string "undefined" or "null" treated as missing title
     */
    public function test_missing_title_handled_gracefully(): void
    {
        $desc1 = LedgerService::generateExpenseDescription('salah', null);
        $this->assertEquals('Expense payment for salah', $desc1);

        $desc2 = LedgerService::generateExpenseDescription('salah', '');
        $this->assertEquals('Expense payment for salah', $desc2);

        $desc3 = LedgerService::generateExpenseDescription('salah', 'undefined');
        $this->assertEquals('Expense payment for salah', $desc3);

        $desc4 = LedgerService::generateExpenseDescription('salah', 'null');
        $this->assertEquals('Expense payment for salah', $desc4);

        $desc5 = LedgerService::generateExpenseDescription(null, 'water');
        $this->assertEquals('Expense payment - water', $desc5);

        $desc6 = LedgerService::generateExpenseDescription(null, null);
        $this->assertEquals('Expense payment', $desc6);

        // Same vendor and title should not duplicate
        $desc7 = LedgerService::generateExpenseDescription('water', 'water');
        $this->assertEquals('Expense payment for water', $desc7);
    }
}
