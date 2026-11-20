<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('correos_simulados', function (Blueprint $table) {
            // Hash del token de lectura de la demo (solo lo tiene quien contrató).
            $table->char('token_lectura', 64)->nullable()->unique();
        });
    }

    public function down(): void
    {
        Schema::table('correos_simulados', function (Blueprint $table) {
            $table->dropUnique(['token_lectura']);
            $table->dropColumn('token_lectura');
        });
    }
};
