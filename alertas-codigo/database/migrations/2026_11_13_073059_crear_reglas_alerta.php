<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reglas_alerta', function (Blueprint $t) {
            $t->id();
            $t->string('tipo', 20);          // moisture | silo_temp | no_rain | market | price_target
            $t->string('severidad', 10);     // critical | warning | info
            $t->json('parametros');
            $t->boolean('activa')->default(true);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reglas_alerta');
    }
};
