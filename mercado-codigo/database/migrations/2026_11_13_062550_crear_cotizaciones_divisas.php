<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cotizaciones_divisas', function (Blueprint $t) {
            $t->id();
            $t->date('fecha');
            $t->string('tipo', 15);                                       // oficial_bna | exportador
            $t->decimal('valor_ars_usd', 12, 4);
            $t->string('fuente', 10);                                     // api | manual
            $t->timestamp('creado_en')->nullable();
            $t->unique(['fecha', 'tipo', 'fuente']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cotizaciones_divisas');
    }
};
