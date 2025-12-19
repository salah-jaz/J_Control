<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            $table->string('type'); // 'Income' or 'Expense'
            $table->date('date');
            $table->decimal('amount', 15, 2);
            $table->string('currency')->default('INR');
            $table->string('category')->nullable();
            $table->string('method')->nullable();
            $table->string('bank')->nullable();
            $table->string('reference_id')->nullable(); // External Transaction ID
            $table->text('description')->nullable();
            $table->string('status')->default('Completed');
            // Polymorphic relation fields (optional but good for linking back)
            $table->unsignedBigInteger('related_id')->nullable();
            $table->string('related_type')->nullable(); // 'App\Models\Income' or 'App\Models\Expense'
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('transactions');
    }
};
