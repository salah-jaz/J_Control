<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\{User, Client, Lead, Product, BankAccount, Invoice, InvoiceItem, Quotation, QuotationItem, Agreement, Transaction, PlannerEvent, Income, Expense, Setting};
use Faker\Factory as Faker;

class TestModuleSeeder extends Seeder
{
    public function run()
    {
        $faker = Faker::create('en_IN');

        // Create a default admin user first
        User::create([
            'name' => 'Admin User',
            'email' => 'admin@jcontrol.com',
            'password' => Hash::make('admin123'),
            'phone' => '9876543210',
            'role' => 'admin',
            'status' => 'active',
        ]);

        $indianCities = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Ahmedabad', 'Chennai', 'Kolkata', 'Surat', 'Pune', 'Jaipur', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Thane', 'Bhopal'];
        $indianStates = ['Maharashtra', 'Delhi', 'Karnataka', 'Telangana', 'Gujarat', 'Tamil Nadu', 'West Bengal', 'Rajasthan', 'Uttar Pradesh', 'Madhya Pradesh'];

        for ($i = 1; $i <= 15; $i++) {
            // 1. User
            $user = User::create([
                'name' => $faker->name,
                'email' => $faker->unique()->safeEmail,
                'password' => Hash::make('password'),
                'phone' => '9' . $faker->numerify('#########'),
                'role' => $faker->randomElement(['admin', 'manager', 'staff']),
                'status' => 'active',
                'department' => $faker->randomElement(['Sales', 'Marketing', 'Operations', 'Finance', 'IT']),
            ]);

            // 2. Client
            $client = Client::create([
                'client_name' => $faker->name,
                'company_name' => $faker->company . ' Pvt Ltd',
                'email_address' => $faker->unique()->safeEmail,
                'status' => 'active',
                'mobile_number' => '9' . $faker->numerify('#########'),
                'company_type' => $faker->randomElement(['Private Limited', 'Partnership', 'Sole Proprietorship', 'LLP']),
                'address_line_1' => $faker->streetAddress,
                'city' => $faker->randomElement($indianCities),
                'state' => $faker->randomElement($indianStates),
                'country' => 'India',
                'pincode' => $faker->postcode,
                'gst_number' => $faker->numerify('27AAAAA####A1Z#'),
                'pan_number' => $faker->numerify('AAAAA####A'),
            ]);

            // 3. Lead
            $lead = Lead::create([
                'first_name' => $faker->firstName,
                'last_name' => $faker->lastName,
                'email' => $faker->unique()->safeEmail,
                'phone' => '8' . $faker->numerify('#########'),
                'company' => $faker->company . ' Solutions',
                'status' => $faker->randomElement(['New', 'Contacted', 'Qualified', 'Proposal Sent', 'Converted']),
                'source' => $faker->randomElement(['Website', 'Referral', 'LinkedIn', 'Cold Call', 'Email Marketing']),
                'priority' => $faker->randomElement(['Low', 'Medium', 'High']),
                'location' => $faker->randomElement($indianCities),
            ]);

            // 4. Product / Service
            $product = Product::create([
                'name' => $faker->randomElement([
                    'ERP Software License', 'Custom Web Development', 'Mobile App Maintenance',
                    'Cloud Hosting (Annual)', 'Digital Marketing SEO', 'UI/UX Design Kit',
                    'Corporate Training Session', 'IT Support Services', 'Security Audit',
                    'API Integration Module'
                ]) . ' - ' . $faker->word,
                'description' => $faker->sentence(10),
                'price' => $faker->randomFloat(2, 5000, 250000),
                'type' => $faker->randomElement(['Product', 'Service']),
                'status' => 'Active',
                'enable_alert' => $faker->boolean,
            ]);

            // 5. Bank Account
            $bankAccount = BankAccount::create([
                'bank_name' => $faker->randomElement(['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Mahindra Bank']),
                'account_name' => 'J-Control ERP - ' . $faker->word,
                'account_number' => $faker->numerify('##########'),
                'account_type' => $faker->randomElement(['Current', 'Savings', 'OD']),
                'ifsc_code' => strtoupper($faker->bothify('????0######')),
                'branch_name' => $faker->randomElement($indianCities) . ' Branch',
                'current_balance' => $faker->randomFloat(2, 100000, 5000000),
                'status' => 'active',
            ]);

            // 6. Invoice & Items
            $invoiceAmount = $faker->randomFloat(2, 10000, 1000000);
            $invoiceDate = $faker->dateTimeBetween('-6 months', 'now')->format('Y-m-d');
            $invoice = Invoice::create([
                'invoice_number' => 'INV/' . date('Y') . '/' . str_pad($i, 4, '0', STR_PAD_LEFT),
                'client_id' => $client->id,
                'client_name' => $client->client_name,
                'date' => $invoiceDate,
                'amount' => $invoiceAmount,
                'status' => $faker->randomElement(['Paid', 'Unpaid', 'Overdue', 'Partial']),
                'gst' => $invoiceAmount * 0.18,
                'grand_total' => $invoiceAmount * 1.18,
                'bank_account_id' => $bankAccount->id,
                'invoice_number' => 'INV-IN-' . $faker->unique()->numerify('#####'),
            ]);
            
            InvoiceItem::create([
                'invoice_id' => $invoice->id,
                'service_name' => substr($product->name, 0, 50),
                'payment_status' => $invoice->status,
                'amount' => $invoiceAmount,
            ]);

            // 7. Quotation & Items
            $quotationAmount = $faker->randomFloat(2, 10000, 1000000);
            $quotation = Quotation::create([
                'quotation_no' => 'QUO/IN/' . date('Y') . '/' . str_pad($i, 4, '0', STR_PAD_LEFT),
                'client_id' => $client->id,
                'date' => $faker->dateTimeBetween('-1 month', 'now')->format('Y-m-d'),
                'expiry_date' => $faker->dateTimeBetween('now', '+1 month')->format('Y-m-d'),
                'status' => $faker->randomElement(['Draft', 'Sent', 'Accepted', 'Rejected', 'Expired']),
                'subtotal' => $quotationAmount,
                'total' => $quotationAmount * 1.18,
                'tax' => $quotationAmount * 0.18,
            ]);
            
            QuotationItem::create([
                'quotation_id' => $quotation->id,
                'item' => substr($product->name, 0, 50),
                'qty' => $faker->numberBetween(1, 10),
                'price' => $quotationAmount,
                'amount' => $quotationAmount,
            ]);

            // 8. Agreement
            Agreement::create([
                'agreement_no' => 'AGR/IN/' . date('Y') . '/' . str_pad($i, 4, '0', STR_PAD_LEFT),
                'title' => 'Service Level Agreement - ' . $client->company_name,
                'client_id' => $client->id,
                'quotation_id' => $quotation->id,
                'date' => $faker->date(),
                'status' => $faker->randomElement(['Draft', 'Sent', 'Signed', 'Active', 'Expired']),
                'content' => ['terms' => 'Standard Indian jurisdiction terms apply.'],
            ]);

            // 12. Planner Event
            PlannerEvent::create([
                'title' => $faker->randomElement(['Client Onboarding', 'Technical Review', 'Contract Negotiation', 'Project Demo', 'Monthly Support Call']),
                'description' => $faker->paragraph,
                'event_date' => $faker->dateTimeBetween('-1 week', '+2 weeks')->format('Y-m-d'),
                'start_time' => $faker->time('H:i'),
                'end_time' => $faker->time('H:i'),
                'category' => $faker->randomElement(['Meeting', 'Call', 'Task', 'Deadline']),
                'client_id' => $client->id,
                'status' => $faker->randomElement(['Scheduled', 'Completed', 'Cancelled', 'Rescheduled']),
                'created_by' => $user->id,
            ]);
            
            // 14. Print Templates
            \App\Models\PrintTemplate::create([
                'id' => $faker->unique()->slug,
                'name' => $faker->randomElement(['Modern GST Invoice', 'Corporate Quotation', 'Standard Agreement', 'Simple Bill']),
                'module' => $faker->randomElement(['invoice', 'quotation', 'agreement']),
                'is_default' => $i === 1,
                'description' => 'Professional print template for ' . $faker->word,
                'template_html' => '<div style="font-family: Arial;"><h1>{{ company_name }}</h1><p>GSTIN: {{ gstin }}</p></div>',
                'template_css' => 'h1 { color: #1a365d; }',
            ]);
        }

        // 13. Settings
        Setting::create([
            'company' => [
                'name' => 'J-Control ERP Systems India',
                'address' => '123, Business Park, Andheri East, Mumbai, Maharashtra 400069',
                'phone' => '+91 22 1234 5678',
                'email' => 'contact@jcontrol.in',
                'gstin' => '27AAAAA0000A1Z5'
            ],
            'finance' => [
                'currency' => 'INR',
                'currency_symbol' => '₹',
                'financial_year_start' => '04-01',
                'tax_rate' => 18
            ],
            'preferences' => [
                'theme' => 'dark',
                'language' => 'en',
                'date_format' => 'd-m-Y'
            ]
        ]);

        $this->command->info('Indian Real Data Seeded Successfully (Income, Expense, Transactions skipped)!');
    }
}
