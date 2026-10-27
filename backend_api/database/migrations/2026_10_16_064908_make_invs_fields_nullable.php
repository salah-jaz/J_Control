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
        if (DB::getDriverName() === 'sqlite') {
            return;
        }
        DB::statement("ALTER TABLE `invs` MODIFY `name` VARCHAR(255) NULL");
        DB::statement("ALTER TABLE `invs` MODIFY `jazno` VARCHAR(255) NULL");
        DB::statement("ALTER TABLE `invs` MODIFY `date` DATE NULL");
        DB::statement("ALTER TABLE `invs` MODIFY `amount` DECIMAL(15,2) NULL DEFAULT 0.00");
        DB::statement("ALTER TABLE `invs` MODIFY `bank_account_id` BIGINT UNSIGNED NULL");
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }
        DB::statement("ALTER TABLE `invs` MODIFY `name` VARCHAR(255) NOT NULL");
        DB::statement("ALTER TABLE `invs` MODIFY `jazno` VARCHAR(255) NOT NULL");
        DB::statement("ALTER TABLE `invs` MODIFY `date` DATE NOT NULL");
        DB::statement("ALTER TABLE `invs` MODIFY `amount` DECIMAL(15,2) NOT NULL");
        DB::statement("ALTER TABLE `invs` MODIFY `bank_account_id` BIGINT UNSIGNED NOT NULL");
    }
};
