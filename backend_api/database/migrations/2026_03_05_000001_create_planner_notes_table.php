<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('planner_notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->nullable()->constrained('planner_events')->nullOnDelete();
            $table->string('title');
            $table->text('content')->nullable();
            $table->string('category')->nullable();
            $table->string('priority')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('planner_notes');
    }
};

