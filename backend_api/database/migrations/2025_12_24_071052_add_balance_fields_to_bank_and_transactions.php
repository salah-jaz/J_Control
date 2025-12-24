<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        // Add current_balance to bank_accounts
        Schema::table('bank_accounts', function (Blueprint $table) {
            $table->decimal('current_balance', 15, 2)->default(0)->after('opening_balance');
        });

        // Initialize current_balance with opening_balance
        DB::statement('UPDATE bank_accounts SET current_balance = opening_balance');

        // Add bank_account_id to incomes
        Schema::table('incomes', function (Blueprint $table) {
            $table->unsignedBigInteger('bank_account_id')->nullable()->after('bank');
            // $table->foreign('bank_account_id')->references('id')->on('bank_accounts')->onDelete('set null'); // Optional FK constraint
        });

        // Add bank_account_id to expenses
        Schema::table('expenses', function (Blueprint $table) {
            $table->unsignedBigInteger('bank_account_id')->nullable()->after('bank');
            // $table->foreign('bank_account_id')->references('id')->on('bank_accounts')->onDelete('set null'); // Optional FK constraint
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('bank_accounts', function (Blueprint $table) {
            $table->dropColumn('current_balance');
        });

        Schema::table('incomes', function (Blueprint $table) {
            $table->dropColumn('bank_account_id');
        });

        Schema::table('expenses', function (Blueprint $table) {
            $table->dropColumn('bank_account_id');
        });
    }
};
