<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->string('invoice_number', 32)->nullable()->unique()->after('id');
            $table->string('discount_type', 20)->default('Flat')->after('discount'); // Flat, Percentage
            $table->string('bank_name')->nullable()->after('bank_account_id');
            $table->string('account_number', 64)->nullable()->after('bank_name');
            $table->boolean('initial_deposit_enabled')->default(false)->after('account_number');
            $table->decimal('initial_deposit_amount', 15, 2)->nullable()->after('initial_deposit_enabled');
            $table->unsignedBigInteger('initial_deposit_bank_id')->nullable()->after('initial_deposit_amount');
            $table->json('extra_installments')->nullable()->after('initial_deposit_bank_id');
        });

        Schema::table('incomes', function (Blueprint $table) {
            if (!Schema::hasColumn('incomes', 'invoice_id')) {
                $table->unsignedBigInteger('invoice_id')->nullable()->after('id');
            }
        });

        Schema::table('expenses', function (Blueprint $table) {
            if (!Schema::hasColumn('expenses', 'invoice_id')) {
                $table->unsignedBigInteger('invoice_id')->nullable()->after('id');
            }
        });

        Schema::table('transactions', function (Blueprint $table) {
            if (!Schema::hasColumn('transactions', 'invoice_id')) {
                $table->unsignedBigInteger('invoice_id')->nullable()->after('related_type');
            }
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn([
                'invoice_number', 'discount_type', 'bank_name', 'account_number',
                'initial_deposit_enabled', 'initial_deposit_amount', 'initial_deposit_bank_id', 'extra_installments'
            ]);
        });
        Schema::table('incomes', function (Blueprint $table) {
            if (Schema::hasColumn('incomes', 'invoice_id')) $table->dropColumn('invoice_id');
        });
        Schema::table('expenses', function (Blueprint $table) {
            if (Schema::hasColumn('expenses', 'invoice_id')) $table->dropColumn('invoice_id');
        });
        Schema::table('transactions', function (Blueprint $table) {
            if (Schema::hasColumn('transactions', 'invoice_id')) $table->dropColumn('invoice_id');
        });
    }
};
