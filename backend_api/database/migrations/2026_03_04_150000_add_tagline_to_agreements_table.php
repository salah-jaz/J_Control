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
        if (! Schema::hasTable('agreements')) {
            return;
        }

        Schema::table('agreements', function (Blueprint $table) {
            if (! Schema::hasColumn('agreements', 'tagline')) {
                $table->string('tagline')->nullable()->after('title');
            }

            if (! Schema::hasColumn('agreements', 'override_company_name')) {
                $table->string('override_company_name')->nullable()->after('tagline');
            }
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        if (! Schema::hasTable('agreements')) {
            return;
        }

        Schema::table('agreements', function (Blueprint $table) {
            $columns = [];

            if (Schema::hasColumn('agreements', 'tagline')) {
                $columns[] = 'tagline';
            }

            if (Schema::hasColumn('agreements', 'override_company_name')) {
                $columns[] = 'override_company_name';
            }

            if (! empty($columns)) {
                $table->dropColumn($columns);
            }
        });
    }
};
