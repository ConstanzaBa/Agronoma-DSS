<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('resultados_indice_venta', function (Blueprint $t) {
            $t->id();
            $t->unsignedBigInteger('usuario_id');                         // agregado: dueño del silo
            $t->unsignedBigInteger('silo_id');                            // ref. lógica a silos
            $t->unsignedTinyInteger('puntaje');
            $t->string('veredicto', 10);                                  // sell | review | wait
            $t->json('reglas_aplicadas');
            $t->timestamp('calculado_en')->useCurrent();
            $t->index(['silo_id', 'calculado_en']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('resultados_indice_venta');
    }
};
