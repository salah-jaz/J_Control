<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('planner_events', function (Blueprint $table) {
            $table->string('status')->default('scheduled')->after('reminder_time');
            $table->timestamp('completed_at')->nullable()->after('status');
            $table->unsignedBigInteger('rescheduled_from')->nullable()->after('completed_at');
            $table->text('cancel_reason')->nullable()->after('rescheduled_from');
            $table->text('meeting_notes')->nullable()->after('cancel_reason');

            $table->foreign('rescheduled_from')
                ->references('id')
                ->on('planner_events')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('planner_events', function (Blueprint $table) {
            $table->dropForeign(['rescheduled_from']);
            $table->dropColumn([
                'status',
                'completed_at',
                'rescheduled_from',
                'cancel_reason',
                'meeting_notes',
            ]);
        });
    }
};

