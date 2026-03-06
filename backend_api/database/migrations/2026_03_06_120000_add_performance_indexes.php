<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add indexes for frequently filtered/sorted columns to improve query performance.
     */
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->index('client_id');
            $table->index('status');
            $table->index('date');
            $table->index('created_at');
        });

        Schema::table('clients', function (Blueprint $table) {
            $table->index('status');
            $table->index('created_at');
        });

        Schema::table('planner_events', function (Blueprint $table) {
            $table->index('event_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropIndex(['client_id']);
            $table->dropIndex(['status']);
            $table->dropIndex(['date']);
            $table->dropIndex(['created_at']);
        });
        Schema::table('clients', function (Blueprint $table) {
            $table->dropIndex(['status']);
            $table->dropIndex(['created_at']);
        });
        Schema::table('planner_events', function (Blueprint $table) {
            $table->dropIndex(['event_date']);
        });
    }
};
