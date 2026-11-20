<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * cuenta_id: referencia lógica a la cuenta que Campo creó para este administrador (sin FK entre servicios).
     * Solo la tienen los administradores; empleados quedan en null. El índice único garantiza un administrador por cuenta.
     * Los administradores creados antes de este cambio quedan en null hasta un backfill operativo.
     */
    public function up(): void
    {
        Schema::table('usuarios', function (Blueprint $table) {
            $table->unsignedBigInteger('cuenta_id')->nullable()->unique();
        });
    }

    public function down(): void
    {
        Schema::table('usuarios', function (Blueprint $table) {
            $table->dropUnique(['cuenta_id']);
            $table->dropColumn('cuenta_id');
        });
    }
};
