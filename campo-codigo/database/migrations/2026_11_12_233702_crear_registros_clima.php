<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('registros_clima', function (Blueprint $table) {
            $table->id();

            $table->foreignId('establecimiento_id')
                ->constrained('establecimientos_rurales')
                ->cascadeOnDelete();

            $table->timestamp('consultado_en')->useCurrent();
            $table->decimal('temperatura_c', 5, 2)->nullable();
            $table->decimal('humedad_pct', 5, 2)->nullable();
            $table->decimal('precipitacion_mm', 6, 2)->nullable();
            $table->decimal('viento_kmh', 5, 2)->nullable();
            $table->json('pronostico')->nullable();
            $table->string('fuente', 20)->default('open-meteo');

            $table->index(['establecimiento_id', 'consultado_en']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('registros_clima');
    }
};
