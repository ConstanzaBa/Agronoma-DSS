<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('objetivos_precio', function (Blueprint $t) {
            $t->id();
            $t->unsignedBigInteger('usuario_id')->index();              // ref. lógica a auth
            $t->unsignedBigInteger('tipo_cultivo_id');                  // ref. lógica a campo
            $t->string('moneda', 3)->default('USD');                    // USD | ARS
            $t->string('direccion', 5)->default('sube');                // sube | baja
            $t->decimal('umbral', 12, 2);
            $t->boolean('activo')->default(true);
            $t->timestamp('ultimo_disparo_en')->nullable();
            $t->timestamp('creado_en')->nullable();
            $t->timestamp('actualizado_en')->nullable();
            $t->index(['tipo_cultivo_id', 'activo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('objetivos_precio');
    }
};
