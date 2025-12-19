<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->string('vendor');
            $table->string('expense_type');
            $table->string('project')->nullable();
            $table->string('category')->nullable();
            $table->string('bill_no')->nullable();
            $table->decimal('amount', 15, 2);
            $table->string('currency')->default('INR');
            $table->string('method');
            $table->string('transaction_id')->nullable();
            $table->string('bank')->nullable();
            $table->date('paid_date');
            $table->string('status')->default('Paid');
            $table->string('gst_applied')->default('No');
            $table->decimal('gst_percent', 5, 2)->nullable();
            $table->decimal('gst_amount', 15, 2)->nullable();
            $table->decimal('net_amount', 15, 2)->nullable();
            $table->string('vendor_gstin')->nullable();
            $table->string('itc_eligible')->default('No');
            $table->string('staff')->nullable();
            $table->string('department')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expenses');
    }
};
