<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('incomes', function (Blueprint $table) {
            if (!Schema::hasColumn('incomes', 'initial_deposit_amount')) {
                $table->decimal('initial_deposit_amount', 15, 2)->nullable()->after('net_amount');
            }
            if (!Schema::hasColumn('incomes', 'initial_deposit_bank_id')) {
                $table->unsignedBigInteger('initial_deposit_bank_id')->nullable()->after('initial_deposit_amount');
            }
            if (!Schema::hasColumn('incomes', 'extra_installments')) {
                $table->json('extra_installments')->nullable()->after('initial_deposit_bank_id');
            }
        });
    }

    public function down()
    {
        Schema::table('incomes', function (Blueprint $table) {
            if (Schema::hasColumn('incomes', 'extra_installments')) $table->dropColumn('extra_installments');
            if (Schema::hasColumn('incomes', 'initial_deposit_bank_id')) $table->dropColumn('initial_deposit_bank_id');
            if (Schema::hasColumn('incomes', 'initial_deposit_amount')) $table->dropColumn('initial_deposit_amount');
        });
    }
};
