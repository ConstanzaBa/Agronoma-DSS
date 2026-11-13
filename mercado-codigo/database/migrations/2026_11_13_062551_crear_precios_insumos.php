<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('precios_insumos', function (Blueprint $t) {
            $t->id();
            $t->string('insumo', 15);                                     // urea | pda | gasoil
            $t->date('fecha');
            $t->decimal('precio_usd', 10, 2);
            $t->string('unidad', 10);                                     // tn | litro
            $t->string('fuente', 10)->default('manual');
            $t->unsignedBigInteger('creado_por')->nullable();
            $t->timestamp('creado_en')->nullable();
            $t->unique(['insumo', 'fecha', 'fuente']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('precios_insumos');
    }
};
