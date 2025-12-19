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
        Schema::create('bank_accounts', function (Blueprint $table) {
            $table->id();
            $table->string('bank_name');
            $table->string('account_name');
            $table->string('nick_name')->nullable();
            $table->string('account_type'); // Savings, Current
            $table->string('account_number');
            $table->string('ifsc_code');
            $table->string('branch_name')->nullable();
            $table->string('micr_code')->nullable();
            $table->string('swift_code')->nullable();
            $table->decimal('opening_balance', 15, 2)->nullable();
            $table->string('currency')->default('INR');
            $table->string('status')->default('Active'); // Active, Inactive
            $table->date('opening_date')->nullable();
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
        Schema::dropIfExists('bank_accounts');
    }
};
