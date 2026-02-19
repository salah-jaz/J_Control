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
        if (!Schema::hasColumn('clients', 'company_type')) {
            Schema::table('clients', function (Blueprint $table) {
                $table->string('company_type')->default('Proprietorship')->after('company_logo');
            });
        }
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        if (Schema::hasColumn('clients', 'company_type')) {
            Schema::table('clients', function (Blueprint $table) {
                $table->dropColumn('company_type');
            });
        }
    }
};
