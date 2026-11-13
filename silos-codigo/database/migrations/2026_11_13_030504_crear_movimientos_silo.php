<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('movimientos_silo', function (Blueprint $t) {
            $t->id();
            $t->foreignId('silo_id')->constrained('silos');
            $t->unsignedBigInteger('usuario_id');                   // ref. lógica a auth
            $t->string('direccion', 3);                             // in | out
            $t->decimal('toneladas', 10, 2);
            $t->date('fecha_movimiento');
            $t->string('observacion', 255)->nullable();
            $t->char('clave_idempotencia', 36)->unique();
            $t->timestamp('creado_en')->nullable();
            $t->index(['silo_id', 'fecha_movimiento']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('movimientos_silo');
    }
};
