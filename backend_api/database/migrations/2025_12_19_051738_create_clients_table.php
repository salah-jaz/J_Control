<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('clients', function (Blueprint $table) {
            $table->id();
            
            // Basic Company Information
            $table->string('company_name');
            $table->string('company_logo')->nullable();
            $table->string('default_currency')->default('INR');
            $table->string('financial_year')->nullable();

            // Contact Details
            $table->string('primary_contact_name')->nullable();
            $table->string('contact_person_name')->nullable();
            $table->string('mobile_number')->nullable();
            $table->string('email_address')->nullable();
            $table->string('website_url')->nullable();

            // Address Details
            $table->text('address_line_1')->nullable();
            $table->text('address_line_2')->nullable();
            $table->string('city')->nullable();
            $table->string('state')->nullable();
            $table->string('country')->nullable();
            $table->string('pincode')->nullable();

            // Tax & Compliance
            $table->string('gst_registration_type')->nullable();
            $table->string('gst_state_code')->nullable();
            $table->string('gst_number')->nullable();
            $table->string('pan_number')->nullable();
            $table->string('cin_number')->nullable();
            $table->string('msme_number')->nullable();
            $table->string('tan_number')->nullable();

            // Bank Details
            $table->string('bank_name')->nullable();
            $table->string('account_holder_name')->nullable();
            $table->string('account_number')->nullable();
            $table->string('ifsc_code')->nullable();
            $table->string('upi_id')->nullable();
            $table->string('cheque_print_name')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('clients');
    }
};
