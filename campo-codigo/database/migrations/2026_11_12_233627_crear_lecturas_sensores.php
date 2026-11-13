<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lecturas_sensores', function (Blueprint $table) {
            $table->id();

            $table->foreignId('dispositivo_id')
                ->constrained('dispositivos')
                ->cascadeOnDelete();

            $table->foreignId('lote_id')
                ->constrained('lotes')
                ->cascadeOnDelete();

            $table->unsignedBigInteger('secuencia');
            $table->decimal('humedad_suelo_pct', 5, 2);
            $table->decimal('humedad_aire_pct', 5, 2);
            $table->decimal('temperatura_c', 5, 2);
            $table->decimal('precipitacion_mm', 6, 2)->nullable();
            $table->timestamp('medido_en')->useCurrent();
            $table->timestamp('recibido_en')->useCurrent();

            $table->unique(['dispositivo_id', 'secuencia']);
            $table->index(['lote_id', 'medido_en']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lecturas_sensores');
    }
};
