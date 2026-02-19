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
        if (!Schema::hasColumn('clients', 'secondary_mobile_number')) {
            Schema::table('clients', function (Blueprint $table) {
                $table->string('secondary_mobile_number')->nullable()->after('mobile_number');
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
        if (Schema::hasColumn('clients', 'secondary_mobile_number')) {
            Schema::table('clients', function (Blueprint $table) {
                $table->dropColumn('secondary_mobile_number');
            });
        }
    }
};
