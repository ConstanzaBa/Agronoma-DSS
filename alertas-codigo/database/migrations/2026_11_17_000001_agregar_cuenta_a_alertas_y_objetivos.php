<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * cuenta_id / establecimiento_id: refs. lógicas (sin FK ni acceso a otras bases).
     * Nullable para convivir con filas y emisores previos: sin cuenta solo las ve el admin que las originó.
     */
    public function up(): void
    {
        Schema::table('alertas', function (Blueprint $t) {
            $t->unsignedBigInteger('cuenta_id')->nullable()->after('id');
            $t->unsignedBigInteger('establecimiento_id')->nullable()->after('cuenta_id');
            $t->index(['cuenta_id', 'establecimiento_id', 'estado']);
        });

        Schema::table('objetivos_precio', function (Blueprint $t) {
            $t->unsignedBigInteger('cuenta_id')->nullable()->after('id');
            $t->index('cuenta_id');
        });
    }

    public function down(): void
    {
        Schema::table('objetivos_precio', function (Blueprint $t) {
            $t->dropIndex(['cuenta_id']);
            $t->dropColumn('cuenta_id');
        });

        Schema::table('alertas', function (Blueprint $t) {
            $t->dropIndex(['cuenta_id', 'establecimiento_id', 'estado']);
            $t->dropColumn(['cuenta_id', 'establecimiento_id']);
        });
    }
};
