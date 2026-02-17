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
        Schema::create('incomes', function (Blueprint $table) {
            $table->id();
            $table->string('customer');
            $table->string('source');
            $table->string('project')->nullable();
            $table->string('category')->nullable();
            $table->string('invoice_no')->nullable();
            $table->decimal('amount', 15, 2);
            $table->string('currency')->default('INR');
            $table->string('method');
            $table->string('transaction_id')->nullable();
            $table->string('bank')->nullable();
            $table->date('received_date')->nullable();
            $table->string('status');
            $table->string('gst_applied')->default('No');
            $table->decimal('gst_percent', 5, 2)->nullable();
            $table->decimal('gst_amount', 15, 2)->nullable();
            $table->decimal('net_amount', 15, 2)->nullable();
            $table->string('staff')->nullable();
            $table->string('department')->nullable();
            $table->text('notes')->nullable();
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
        Schema::dropIfExists('incomes');
    }
};
