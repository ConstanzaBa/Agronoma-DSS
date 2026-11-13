<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dispositivos', function (Blueprint $table) {
            $table->id();

            $table->foreignId('lote_id')
                ->constrained('lotes')
                ->cascadeOnDelete();

            $table->string('nombre', 80);
            $table->char('identificador_unico', 36)->unique();
            $table->decimal('latitud', 10, 7)->nullable();
            $table->decimal('longitud', 10, 7)->nullable();
            $table->boolean('activo')->default(true);
            $table->timestamp('ultima_conexion_en')->nullable();
            $table->unsignedBigInteger('ultima_secuencia')->default(0);
            $table->timestamp('creado_en')->nullable();
            $table->timestamp('actualizado_en')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dispositivos');
    }
};
