<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            if (!Schema::hasColumn('expenses', 'discount_amount')) {
                $table->decimal('discount_amount', 15, 2)->nullable()->after('amount');
            }
            if (!Schema::hasColumn('expenses', 'initial_deposit_amount')) {
                $table->decimal('initial_deposit_amount', 15, 2)->nullable()->after('net_amount');
            }
            if (!Schema::hasColumn('expenses', 'initial_deposit_bank_id')) {
                $table->unsignedBigInteger('initial_deposit_bank_id')->nullable()->after('initial_deposit_amount');
            }
            if (!Schema::hasColumn('expenses', 'extra_installments')) {
                $table->json('extra_installments')->nullable()->after('initial_deposit_bank_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            if (Schema::hasColumn('expenses', 'extra_installments')) {
                $table->dropColumn('extra_installments');
            }
            if (Schema::hasColumn('expenses', 'initial_deposit_bank_id')) {
                $table->dropColumn('initial_deposit_bank_id');
            }
            if (Schema::hasColumn('expenses', 'initial_deposit_amount')) {
                $table->dropColumn('initial_deposit_amount');
            }
            if (Schema::hasColumn('expenses', 'discount_amount')) {
                $table->dropColumn('discount_amount');
            }
        });
    }
};
