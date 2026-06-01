<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leave_balances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->integer('year');
            $table->decimal('casual_leave', 5, 2)->default(12.0);
            $table->decimal('sick_leave', 5, 2)->default(12.0);
            $table->decimal('earned_leave', 5, 2)->default(12.0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leave_balances');
    }
};
