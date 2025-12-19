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
        // Using raw SQL to support older MariaDB versions where renameColumn might fail without doctrine/dbal
        // Incomes: customer (string not null) -> client
        DB::statement("ALTER TABLE incomes CHANGE customer client VARCHAR(255) NOT NULL");

        // Invoices: customer_id (string null) -> client_id
        // Invoices: customer_name (string not null) -> client_name
        DB::statement("ALTER TABLE invoices CHANGE customer_id client_id VARCHAR(255) NULL");
        DB::statement("ALTER TABLE invoices CHANGE customer_name client_name VARCHAR(255) NOT NULL");
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        DB::statement("ALTER TABLE incomes CHANGE client customer VARCHAR(255) NOT NULL");
        
        DB::statement("ALTER TABLE invoices CHANGE client_id customer_id VARCHAR(255) NULL");
        DB::statement("ALTER TABLE invoices CHANGE client_name customer_name VARCHAR(255) NOT NULL");
    }
};
