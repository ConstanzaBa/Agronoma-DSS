<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lotes', function (Blueprint $table) {
            $table->id();

            $table->foreignId('establecimiento_id')
                ->constrained('establecimientos_rurales')
                ->cascadeOnDelete();

            $table->string('nombre', 120);
            $table->json('coordenadas');
            $table->decimal('superficie_ha', 10, 2);

            $table->foreignId('tipo_cultivo_id')
                ->nullable()
                ->constrained('tipos_cultivo');

            $table->string('variedad', 80)->nullable();
            $table->string('estado', 10)->default('optimal');
            $table->decimal('ultima_humedad_suelo_pct', 5, 2)->nullable();
            $table->timestamp('creado_en')->nullable();
            $table->timestamp('actualizado_en')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lotes');
    }
};
