<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leads', function (Blueprint $table) {
            $table->id();
            $table->string('first_name');
            $table->string('last_name');
            $table->string('email');
            $table->string('phone')->nullable();
            $table->string('company')->nullable();
            $table->string('job_title')->nullable();
            $table->string('status')->default('New');
            $table->string('source')->nullable();
            $table->string('priority')->default('Medium');
            $table->integer('score')->default(0);
            $table->decimal('value', 15, 2)->default(0);
            $table->string('assigned_to')->nullable();
            $table->boolean('qualified')->default(false);
            $table->text('notes')->nullable();
            $table->string('location')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leads');
    }
};
