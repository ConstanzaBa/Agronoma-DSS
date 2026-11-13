<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('alertas', function (Blueprint $t) {
            $t->id();
            $t->unsignedBigInteger('usuario_id');                       // ref. lógica a auth
            $t->foreignId('regla_id')->nullable()->constrained('reglas_alerta')->nullOnDelete();
            $t->string('tipo', 20);
            $t->string('severidad', 10);
            $t->unsignedBigInteger('lote_id')->nullable();              // ref. lógica a campo
            $t->unsignedBigInteger('silo_id')->nullable();              // ref. lógica a silos
            $t->string('titulo', 120);
            $t->text('mensaje');
            $t->json('datos')->nullable();
            $t->string('estado', 10)->default('active');                // active | attended | resolved
            $t->timestamp('activada_en')->useCurrent();
            $t->timestamp('atendida_en')->nullable();
            $t->timestamp('resuelta_en')->nullable();
            $t->index(['usuario_id', 'estado']);
            $t->index(['lote_id', 'tipo', 'estado']);
            $t->index(['silo_id', 'tipo', 'estado']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('alertas');
    }
};
