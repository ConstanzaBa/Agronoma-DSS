<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('registro_actualizaciones', function (Blueprint $t) {
            $t->id();
            $t->string('recurso', 15);                                    // granos | divisas | insumos
            $t->string('proveedor', 30);
            $t->timestamp('intentado_en')->useCurrent();
            $t->boolean('ok');
            $t->string('detalle', 255)->nullable();
            $t->index(['recurso', 'intentado_en']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('registro_actualizaciones');
    }
};
