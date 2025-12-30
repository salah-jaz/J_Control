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
        DB::statement('ALTER TABLE incomes MODIFY COLUMN received_date DATE NULL');
        DB::statement('ALTER TABLE expenses MODIFY COLUMN paid_date DATE NULL');
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        DB::statement('ALTER TABLE incomes MODIFY COLUMN received_date DATE NOT NULL');
        DB::statement('ALTER TABLE expenses MODIFY COLUMN paid_date DATE NOT NULL');
    }
};
