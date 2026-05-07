<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('print_templates', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('name');
            $table->string('module');
            $table->boolean('is_default')->default(false);
            $table->text('description')->nullable();
            $table->longText('template_html')->nullable();
            $table->longText('template_css')->nullable();
            $table->json('styles')->nullable();
            $table->json('sections')->nullable();
            $table->timestamps();

            $table->index(['module', 'is_default']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('print_templates');
    }
};
