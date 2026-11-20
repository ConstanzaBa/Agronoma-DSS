<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Sin backfill: la tabla debe estar vacía (no hay datos reales que conservar).
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('establecimientos_rurales', function (Blueprint $table) {
            $table->dropIndex(['usuario_id']);
            $table->dropColumn('usuario_id');
            $table->foreignId('cuenta_id')->after('id')->constrained('cuentas')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('establecimientos_rurales', function (Blueprint $table) {
            $table->dropConstrainedForeignId('cuenta_id');
            $table->unsignedBigInteger('usuario_id')->after('id')->index();
        });
    }
};
