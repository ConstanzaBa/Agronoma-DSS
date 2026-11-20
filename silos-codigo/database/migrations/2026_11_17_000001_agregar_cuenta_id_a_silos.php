<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * cuenta_id: ref. lógica a la cuenta de Auth (sin FK ni acceso a otra base).
     * Nullable solo para convivir con filas previas: una fila sin cuenta_id no es visible
     * para nadie (falla cerrado) hasta que se la asigne con un backfill operativo.
     */
    public function up(): void
    {
        Schema::table('silos', function (Blueprint $t) {
            $t->unsignedBigInteger('cuenta_id')->nullable()->after('id');
            $t->index(['cuenta_id', 'establecimiento_id']);
        });
    }

    public function down(): void
    {
        Schema::table('silos', function (Blueprint $t) {
            $t->dropIndex(['cuenta_id', 'establecimiento_id']);
            $t->dropColumn('cuenta_id');
        });
    }
};
