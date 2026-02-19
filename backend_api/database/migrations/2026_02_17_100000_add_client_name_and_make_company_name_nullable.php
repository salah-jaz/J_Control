<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Add client_name; make company_name nullable (at least one required at app level).
     *
     * @return void
     */
    public function up()
    {
        if (!Schema::hasColumn('clients', 'client_name')) {
            Schema::table('clients', function (Blueprint $table) {
                $table->string('client_name')->nullable()->after('id');
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
        if (Schema::hasColumn('clients', 'client_name')) {
            Schema::table('clients', function (Blueprint $table) {
                $table->dropColumn('client_name');
            });
        }
    }
};
