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
        if (!Schema::hasTable('assets')) {
            Schema::create('assets', function (Blueprint $table) {
                $table->id();
                $table->string('product_name')->nullable();
                $table->string('asset_number')->nullable();
                $table->integer('product_count')->nullable();
                $table->decimal('product_value', 15, 2)->nullable();
                $table->timestamps();

                $table->index('product_name');
                $table->index('asset_number');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('assets');
    }
};
