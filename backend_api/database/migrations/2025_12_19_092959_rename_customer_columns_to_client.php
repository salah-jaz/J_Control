<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        if (Schema::hasColumn('incomes', 'customer')) {
            try {
                Schema::table('incomes', function (Blueprint $table) {
                    $table->renameColumn('customer', 'client');
                });
            } catch (\Throwable $e) {
                DB::statement("ALTER TABLE `incomes` CHANGE `customer` `client` VARCHAR(255) NOT NULL");
            }
        }

        if (Schema::hasColumn('invoices', 'customer_id') || Schema::hasColumn('invoices', 'customer_name')) {
            try {
                Schema::table('invoices', function (Blueprint $table) {
                    if (Schema::hasColumn('invoices', 'customer_id')) {
                        $table->renameColumn('customer_id', 'client_id');
                    }
                    if (Schema::hasColumn('invoices', 'customer_name')) {
                        $table->renameColumn('customer_name', 'client_name');
                    }
                });
            } catch (\Throwable $e) {
                if (Schema::hasColumn('invoices', 'customer_id')) {
                    DB::statement("ALTER TABLE `invoices` CHANGE `customer_id` `client_id` VARCHAR(255) NULL");
                }
                if (Schema::hasColumn('invoices', 'customer_name')) {
                    DB::statement("ALTER TABLE `invoices` CHANGE `customer_name` `client_name` VARCHAR(255) NOT NULL");
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        if (Schema::hasColumn('incomes', 'client')) {
            try {
                Schema::table('incomes', function (Blueprint $table) {
                    $table->renameColumn('client', 'customer');
                });
            } catch (\Throwable $e) {
                DB::statement("ALTER TABLE `incomes` CHANGE `client` `customer` VARCHAR(255) NOT NULL");
            }
        }

        if (Schema::hasColumn('invoices', 'client_id') || Schema::hasColumn('invoices', 'client_name')) {
            try {
                Schema::table('invoices', function (Blueprint $table) {
                    if (Schema::hasColumn('invoices', 'client_id')) {
                        $table->renameColumn('client_id', 'customer_id');
                    }
                    if (Schema::hasColumn('invoices', 'client_name')) {
                        $table->renameColumn('client_name', 'customer_name');
                    }
                });
            } catch (\Throwable $e) {
                if (Schema::hasColumn('invoices', 'client_id')) {
                    DB::statement("ALTER TABLE `invoices` CHANGE `client_id` `customer_id` VARCHAR(255) NULL");
                }
                if (Schema::hasColumn('invoices', 'client_name')) {
                    DB::statement("ALTER TABLE `invoices` CHANGE `client_name` `customer_name` VARCHAR(255) NOT NULL");
                }
            }
        }
    }
};
