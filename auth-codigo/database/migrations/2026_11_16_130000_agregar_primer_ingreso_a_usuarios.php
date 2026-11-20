<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // false por defecto: empleados y usuarios existentes no pasan por el primer ingreso.
        Schema::table('usuarios', function (Blueprint $table) {
            $table->boolean('primer_ingreso_pendiente')->default(false);
        });
    }

    public function down(): void
    {
        Schema::table('usuarios', function (Blueprint $table) {
            $table->dropColumn('primer_ingreso_pendiente');
        });
    }
};
