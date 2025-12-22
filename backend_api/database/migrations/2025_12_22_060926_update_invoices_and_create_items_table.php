<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        // Add bank details to invoices
        Schema::table('invoices', function (Blueprint $table) {
            $table->unsignedBigInteger('bank_account_id')->nullable()->after('grand_total');
            $table->string('gpay_number')->nullable()->after('bank_account_id');
            $table->string('qr_code')->nullable()->after('gpay_number');
        });

        // Create invoice items table
        Schema::create('invoice_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained()->onDelete('cascade');
            $table->string('service_name');
            $table->string('payment_status')->nullable();
            $table->decimal('amount', 15, 2);
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('invoice_items');

        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn(['bank_account_id', 'gpay_number', 'qr_code']);
        });
    }
};
