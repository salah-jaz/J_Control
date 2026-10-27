<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Services\LedgerService;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            if (!Schema::hasColumn('transactions', 'previous_balance')) {
                $table->decimal('previous_balance', 15, 2)->nullable()->after('amount');
            }
            if (!Schema::hasColumn('transactions', 'current_balance')) {
                $table->decimal('current_balance', 15, 2)->nullable()->after('previous_balance');
            }
        });

        // Calculate and backfill running balances for all existing historical records
        try {
            LedgerService::syncAllLedgers();
        } catch (\Throwable $e) {
            // Silently ignore during migrations if dependencies are bootstrapping
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            if (Schema::hasColumn('transactions', 'current_balance')) {
                $table->dropColumn('current_balance');
            }
            if (Schema::hasColumn('transactions', 'previous_balance')) {
                $table->dropColumn('previous_balance');
            }
        });
    }
};
