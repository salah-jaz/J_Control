<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agreements', function (Blueprint $table) {
            if (!Schema::hasColumn('agreements', 'attachment')) {
                $table->string('attachment')->nullable()->after('notes');
            }
            if (!Schema::hasColumn('agreements', 'attachment_name')) {
                $table->string('attachment_name')->nullable()->after('attachment');
            }
        });
    }

    public function down(): void
    {
        Schema::table('agreements', function (Blueprint $table) {
            if (Schema::hasColumn('agreements', 'attachment_name')) {
                $table->dropColumn('attachment_name');
            }
            if (Schema::hasColumn('agreements', 'attachment')) {
                $table->dropColumn('attachment');
            }
        });
    }
};
