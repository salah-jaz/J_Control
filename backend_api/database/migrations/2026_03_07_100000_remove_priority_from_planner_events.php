<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Remove priority column from planner_events (priority concept removed from Planner events).
     */
    public function up(): void
    {
        Schema::table('planner_events', function (Blueprint $table) {
            $table->dropColumn('priority');
        });
    }

    public function down(): void
    {
        Schema::table('planner_events', function (Blueprint $table) {
            $table->string('priority')->nullable()->after('category');
        });
    }
};
