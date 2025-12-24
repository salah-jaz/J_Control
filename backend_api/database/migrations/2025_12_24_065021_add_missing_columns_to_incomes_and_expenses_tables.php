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
        Schema::table('incomes', function (Blueprint $table) {
            $table->text('description')->nullable();
            $table->string('reference_number')->nullable();
            $table->date('invoice_date')->nullable();
            $table->date('due_date')->nullable();
            $table->string('recurring')->default('No');
            $table->string('frequency')->nullable();
            $table->string('client_email')->nullable();
            $table->string('client_phone')->nullable();
            $table->string('payment_terms')->nullable();
            $table->string('discount_applied')->default('No');
            $table->decimal('discount_amount', 15, 2)->nullable();
            $table->decimal('late_fee', 15, 2)->nullable();
            $table->string('collection_status')->nullable();
            $table->date('follow_up_date')->nullable();
            $table->decimal('commission', 15, 2)->nullable();
            $table->string('tax_category')->nullable();
        });

        Schema::table('expenses', function (Blueprint $table) {
            $table->text('description')->nullable();
            $table->string('location')->nullable();
            $table->string('reference_number')->nullable();
            $table->date('due_date')->nullable();
            $table->string('recurring')->default('No');
            $table->string('frequency')->nullable();
            $table->string('tax_category')->nullable();
            $table->string('approval_status')->default('Pending');
            $table->string('approved_by')->nullable();
            $table->date('approval_date')->nullable();
            $table->string('tags')->nullable();
            $table->string('priority')->default('Medium');
            $table->string('reimbursement_status')->nullable();
            $table->string('vendor_email')->nullable();
            $table->string('vendor_phone')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('incomes', function (Blueprint $table) {
            $table->dropColumn([
                'description', 'reference_number', 'invoice_date', 'due_date',
                'recurring', 'frequency', 'client_email', 'client_phone',
                'payment_terms', 'discount_applied', 'discount_amount', 'late_fee',
                'collection_status', 'follow_up_date', 'commission', 'tax_category'
            ]);
        });

        Schema::table('expenses', function (Blueprint $table) {
            $table->dropColumn([
                'description', 'location', 'reference_number', 'due_date',
                'recurring', 'frequency', 'tax_category', 'approval_status',
                'approved_by', 'approval_date', 'tags', 'priority',
                'reimbursement_status', 'vendor_email', 'vendor_phone'
            ]);
        });
    }
};
