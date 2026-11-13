<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('registros_lluvia', function (Blueprint $table) {
            $table->id();

            $table->foreignId('lote_id')
                ->constrained('lotes')
                ->cascadeOnDelete();

            $table->unsignedBigInteger('usuario_id');
            $table->decimal('milimetros', 6, 2);
            $table->date('fecha_registro');
            $table->string('observacion', 255)->nullable();
            $table->char('clave_idempotencia', 36)->unique();
            $table->timestamp('creado_en')->nullable();

            $table->index(['lote_id', 'fecha_registro']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('registros_lluvia');
    }
};
