<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Add support for 'overdue' status. Migrate any existing 'missed' to 'overdue'.
     */
    public function up(): void
    {
        DB::table('planner_events')
            ->where('status', 'missed')
            ->update(['status' => 'overdue']);
    }

    public function down(): void
    {
        DB::table('planner_events')
            ->where('status', 'overdue')
            ->update(['status' => 'missed']);
    }
};
