<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Models\BankAccount;
use App\Models\Client;
use App\Models\Income;
use App\Models\Transaction;

class IncomeCustomerNameMappingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $user = \App\Models\User::factory()->create();
        $this->actingAs($user, 'sanctum');
    }

    /**
     * Test creating an Income for a customer with both customer name and company name.
     */
    public function test_income_with_customer_and_company_name(): void
    {
        $bank = BankAccount::create([
            'bank_name' => 'HDFC Bank',
            'account_name' => 'Main Account',
            'account_type' => 'Current',
            'account_number' => 'HDFC-001',
            'ifsc_code' => 'HDFC0001234',
            'opening_balance' => 5000.00,
            'current_balance' => 5000.00,
            'currency' => 'INR',
            'status' => 'Active',
        ]);

        $client = Client::create([
            'client_name' => 'Mohamed Irfan',
            'company_name' => 'Jaz Infotech',
            'email_address' => 'irfan@jazinfotech.com',
            'status' => 'active',
        ]);

        // Post with company name, client name, or formatted name
        $response = $this->postJson('/api/incomes', [
            'client' => 'Mohamed Irfan (Jaz Infotech)',
            'source' => 'Web Development',
            'amount' => 1500.00,
            'bank_account_id' => $bank->id,
            'reference_number' => 'REF-JAZ-01',
            'notes' => 'Project kickoff payment',
            'received_date' => now()->toDateString(),
        ]);

        $response->assertStatus(201);
        $incomeId = $response->json('id');
        $income = Income::with(['transactions', 'bankAccount'])->findOrFail($incomeId);

        // Client attribute has customer name and company name
        $this->assertEquals('Mohamed Irfan (Jaz Infotech)', $income->client);

        // Source description contains both customer name and company name
        $this->assertEquals('Web Development payment for Mohamed Irfan (Jaz Infotech) (Ref: REF-JAZ-01)', $income->source_description);

        // Linked transaction
        $tx = Transaction::where('related_id', $income->id)->where('related_type', Income::class)->first();
        $this->assertNotNull($tx);
        $this->assertEquals('Web Development payment for Mohamed Irfan (Jaz Infotech) (Ref: REF-JAZ-01)', $tx->description);
        $this->assertEquals(1500.00, (float)$tx->amount);

        // Balances preserved
        $this->assertEquals(6500.00, (float)$bank->fresh()->current_balance);

        // Test Transaction API mapping
        $txListResponse = $this->getJson('/api/transactions');
        $txListResponse->assertStatus(200);
        $matchedTx = collect($txListResponse->json('data'))->firstWhere('id', $tx->id);
        $this->assertNotNull($matchedTx);
        $this->assertEquals('Mohamed Irfan (Jaz Infotech)', $matchedTx['party']);
        $this->assertEquals('Web Development payment for Mohamed Irfan (Jaz Infotech) (Ref: REF-JAZ-01)', $matchedTx['description']);
    }

    /**
     * Test creating an Income for a customer without a company name.
     */
    public function test_income_with_customer_having_no_company_name(): void
    {
        $bank = BankAccount::create([
            'bank_name' => 'ICICI Bank',
            'account_name' => 'Savings Account',
            'account_type' => 'Savings',
            'account_number' => 'ICICI-001',
            'ifsc_code' => 'ICIC0001234',
            'opening_balance' => 2000.00,
            'current_balance' => 2000.00,
            'currency' => 'INR',
            'status' => 'Active',
        ]);

        $client = Client::create([
            'client_name' => 'Bob Solo',
            'company_name' => '',
            'email_address' => 'bob@solo.com',
            'status' => 'active',
        ]);

        $response = $this->postJson('/api/incomes', [
            'client' => 'Bob Solo',
            'source' => 'Consulting',
            'amount' => 800.00,
            'bank_account_id' => $bank->id,
            'reference_number' => 'REF-BOB-01',
            'notes' => '1-on-1 Consultation',
            'received_date' => now()->toDateString(),
        ]);

        $response->assertStatus(201);
        $incomeId = $response->json('id');
        $income = Income::with(['transactions', 'bankAccount'])->findOrFail($incomeId);

        // Displays only customer name
        $this->assertEquals('Bob Solo', $income->client);
        $this->assertEquals('Consulting payment for Bob Solo (Ref: REF-BOB-01)', $income->source_description);

        $tx = Transaction::where('related_id', $income->id)->where('related_type', Income::class)->first();
        $this->assertNotNull($tx);
        $this->assertEquals('Consulting payment for Bob Solo (Ref: REF-BOB-01)', $tx->description);

        // Test Transaction API mapping
        $txListResponse = $this->getJson('/api/transactions');
        $txListResponse->assertStatus(200);
        $matchedTx = collect($txListResponse->json('data'))->firstWhere('id', $tx->id);
        $this->assertNotNull($matchedTx);
        $this->assertEquals('Bob Solo', $matchedTx['party']);
        $this->assertEquals('Consulting payment for Bob Solo (Ref: REF-BOB-01)', $matchedTx['description']);
    }

    /**
     * Test mapping legacy records where client was stored only as company name.
     */
    public function test_legacy_record_with_company_name_resolves_to_customer_and_company(): void
    {
        $bank = BankAccount::create([
            'bank_name' => 'SBI Bank',
            'account_name' => 'Operating Account',
            'account_type' => 'Current',
            'account_number' => 'SBI-001',
            'ifsc_code' => 'SBIN0001234',
            'opening_balance' => 1000.00,
            'current_balance' => 1000.00,
            'currency' => 'INR',
            'status' => 'Active',
        ]);

        Client::create([
            'client_name' => 'Md Sulai',
            'company_name' => 'Al Makinus',
            'email_address' => 'sulai@makinus.com',
            'status' => 'active',
        ]);

        // Income stored with legacy company name
        $income = Income::create([
            'client' => 'Al Makinus',
            'source' => 'AMC',
            'amount' => 500.00,
            'method' => 'Bank Account',
            'bank_account_id' => $bank->id,
            'reference_number' => 'REF-LEGACY',
            'received_date' => now()->toDateString(),
            'status' => 'Fully Paid',
        ]);

        // Resolves dynamically
        $this->assertEquals('Md Sulai (Al Makinus)', $income->client);
        $this->assertEquals('AMC payment for Md Sulai (Al Makinus) (Ref: REF-LEGACY)', $income->source_description);
    }

    /**
     * Test editing an Income record preserves customer relationships and updates descriptions.
     */
    public function test_updating_income_customer_updates_descriptions(): void
    {
        $bank = BankAccount::create([
            'bank_name' => 'Axis Bank',
            'account_name' => 'Main Account',
            'account_type' => 'Current',
            'account_number' => 'AXIS-001',
            'ifsc_code' => 'UTIB0001234',
            'opening_balance' => 3000.00,
            'current_balance' => 3000.00,
            'currency' => 'INR',
            'status' => 'Active',
        ]);

        $client1 = Client::create([
            'client_name' => 'Client One',
            'company_name' => 'Company One',
        ]);

        $client2 = Client::create([
            'client_name' => 'Client Two',
            'company_name' => '',
        ]);

        // Create income for Client One
        $createRes = $this->postJson('/api/incomes', [
            'client' => 'Client One (Company One)',
            'source' => 'Support',
            'amount' => 1000.00,
            'bank_account_id' => $bank->id,
            'reference_number' => 'REF-SUP-01',
            'received_date' => now()->toDateString(),
        ]);
        $incomeId = $createRes->json('id');

        // Update to Client Two
        $updateRes = $this->putJson("/api/incomes/{$incomeId}", [
            'client' => 'Client Two',
            'source' => 'Support',
            'amount' => 1000.00,
            'bank_account_id' => $bank->id,
            'reference_number' => 'REF-SUP-01',
            'received_date' => now()->toDateString(),
        ]);

        $updateRes->assertStatus(200);
        $income = Income::with('transactions')->findOrFail($incomeId);
        $this->assertEquals('Client Two', $income->client);
        $this->assertEquals('Support payment for Client Two (Ref: REF-SUP-01)', $income->source_description);

        $tx = Transaction::where('related_id', $income->id)->where('related_type', Income::class)->first();
        $this->assertEquals('Support payment for Client Two (Ref: REF-SUP-01)', $tx->description);
    }
}
