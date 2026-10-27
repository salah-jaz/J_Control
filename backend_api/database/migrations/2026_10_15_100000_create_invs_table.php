<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('invs')) {
            Schema::create('invs', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('jazno');
                $table->date('date');
                $table->decimal('amount', 15, 2);
                $table->unsignedBigInteger('bank_account_id');
                $table->string('status')->default('Received');
                $table->text('notes')->nullable();
                $table->timestamps();

                $table->foreign('bank_account_id')->references('id')->on('bank_accounts')->onDelete('restrict');
                $table->index('name');
                $table->index('jazno');
                $table->index('date');
            });
        }

        if (!Schema::hasColumn('incomes', 'inv_id')) {
            Schema::table('incomes', function (Blueprint $table) {
                $table->unsignedBigInteger('inv_id')->nullable()->after('invoice_id');
                $table->index('inv_id');
            });
        }

        if (!Schema::hasColumn('transactions', 'inv_id')) {
            Schema::table('transactions', function (Blueprint $table) {
                $table->unsignedBigInteger('inv_id')->nullable()->after('invoice_id');
                $table->index('inv_id');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('transactions', 'inv_id')) {
            Schema::table('transactions', function (Blueprint $table) {
                $table->dropIndex(['inv_id']);
                $table->dropColumn('inv_id');
            });
        }

        if (Schema::hasColumn('incomes', 'inv_id')) {
            Schema::table('incomes', function (Blueprint $table) {
                $table->dropIndex(['inv_id']);
                $table->dropColumn('inv_id');
            });
        }

        Schema::dropIfExists('invs');
    }
};
