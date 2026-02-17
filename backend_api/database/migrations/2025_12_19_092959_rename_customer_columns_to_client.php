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
        Schema::table('incomes', function (Blueprint $table) {
            $table->renameColumn('customer', 'client');
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->renameColumn('customer_id', 'client_id');
            $table->renameColumn('customer_name', 'client_name');
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
            $table->renameColumn('client', 'customer');
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->renameColumn('client_id', 'customer_id');
            $table->renameColumn('client_name', 'customer_name');
        });
    }
};
