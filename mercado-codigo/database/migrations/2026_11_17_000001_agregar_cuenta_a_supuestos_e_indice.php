<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * cuenta_id: ref. lógica a la cuenta de Auth (sin FK ni acceso a otra base).
     * Nullable para convivir con filas previas: sin cuenta solo las ve el usuario que las originó (admin).
     */
    public function up(): void
    {
        Schema::table('supuestos_margen', function (Blueprint $t) {
            $t->unsignedBigInteger('cuenta_id')->nullable()->after('id');
            $t->unique(['cuenta_id', 'tipo_cultivo_id']);
        });

        Schema::table('resultados_indice_venta', function (Blueprint $t) {
            $t->unsignedBigInteger('cuenta_id')->nullable()->after('id');
            $t->index(['cuenta_id', 'silo_id', 'calculado_en']);
        });
    }

    public function down(): void
    {
        Schema::table('resultados_indice_venta', function (Blueprint $t) {
            $t->dropIndex(['cuenta_id', 'silo_id', 'calculado_en']);
            $t->dropColumn('cuenta_id');
        });

        Schema::table('supuestos_margen', function (Blueprint $t) {
            $t->dropUnique(['cuenta_id', 'tipo_cultivo_id']);
            $t->dropColumn('cuenta_id');
        });
    }
};
