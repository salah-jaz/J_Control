<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Non-destructive: adds nullable snapshot/contact, document type, notes, and product_id columns.
     */
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            if (!Schema::hasColumn('invoices', 'client_address')) {
                $table->text('client_address')->nullable()->after('client_name');
            }
            if (!Schema::hasColumn('invoices', 'client_phone')) {
                $table->string('client_phone')->nullable()->after('client_address');
            }
            if (!Schema::hasColumn('invoices', 'client_email')) {
                $table->string('client_email')->nullable()->after('client_phone');
            }
            if (!Schema::hasColumn('invoices', 'document_type')) {
                $table->string('document_type')->nullable()->after('client_email');
            }
            if (!Schema::hasColumn('invoices', 'product_notes')) {
                $table->text('product_notes')->nullable()->after('document_type');
            }
            if (!Schema::hasColumn('invoices', 'service_notes')) {
                $table->text('service_notes')->nullable()->after('product_notes');
            }
        });

        Schema::table('invoice_items', function (Blueprint $table) {
            if (!Schema::hasColumn('invoice_items', 'product_id')) {
                $table->unsignedBigInteger('product_id')->nullable()->after('invoice_id');
            }
        });

        Schema::table('quotations', function (Blueprint $table) {
            if (!Schema::hasColumn('quotations', 'client_address')) {
                $table->text('client_address')->nullable()->after('client_id');
            }
            if (!Schema::hasColumn('quotations', 'client_phone')) {
                $table->string('client_phone')->nullable()->after('client_address');
            }
            if (!Schema::hasColumn('quotations', 'client_email')) {
                $table->string('client_email')->nullable()->after('client_phone');
            }
            if (!Schema::hasColumn('quotations', 'document_type')) {
                $table->string('document_type')->nullable()->after('client_email');
            }
            if (!Schema::hasColumn('quotations', 'product_notes')) {
                $table->text('product_notes')->nullable()->after('notes');
            }
            if (!Schema::hasColumn('quotations', 'service_notes')) {
                $table->text('service_notes')->nullable()->after('product_notes');
            }
        });

        Schema::table('quotation_items', function (Blueprint $table) {
            if (!Schema::hasColumn('quotation_items', 'product_id')) {
                $table->unsignedBigInteger('product_id')->nullable()->after('quotation_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            foreach (['client_address', 'client_phone', 'client_email', 'document_type', 'product_notes', 'service_notes'] as $col) {
                if (Schema::hasColumn('invoices', $col)) {
                    $table->dropColumn($col);
                }
            }
        });

        Schema::table('invoice_items', function (Blueprint $table) {
            if (Schema::hasColumn('invoice_items', 'product_id')) {
                $table->dropColumn('product_id');
            }
        });

        Schema::table('quotations', function (Blueprint $table) {
            foreach (['client_address', 'client_phone', 'client_email', 'document_type', 'product_notes', 'service_notes'] as $col) {
                if (Schema::hasColumn('quotations', $col)) {
                    $table->dropColumn($col);
                }
            }
        });

        Schema::table('quotation_items', function (Blueprint $table) {
            if (Schema::hasColumn('quotation_items', 'product_id')) {
                $table->dropColumn('product_id');
            }
        });
    }
};
