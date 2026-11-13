<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('silos', function (Blueprint $t) {
            $t->id();
            $t->unsignedBigInteger('usuario_id')->index();          // agregado: dueño del silo
            $t->unsignedBigInteger('establecimiento_id')->index();  // ref. lógica a campo
            $t->string('nombre', 80);
            $t->string('tipo', 15)->default('silo');                // silo | silobolsa
            $t->decimal('capacidad_tn', 10, 2);
            $t->unsignedBigInteger('tipo_cultivo_id')->nullable();  // ref. lógica a campo
            $t->decimal('humedad_grano_pct', 4, 2)->nullable();
            $t->decimal('temperatura_nucleo_c', 4, 1)->nullable();
            $t->decimal('temperatura_limite_c', 4, 1)->default(25);
            $t->date('almacenado_desde')->nullable();
            $t->timestamp('creado_en')->nullable();
            $t->timestamp('actualizado_en')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('silos');
    }
};
