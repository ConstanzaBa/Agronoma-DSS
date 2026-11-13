<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('supuestos_margen', function (Blueprint $t) {
            $t->id();
            $t->unsignedBigInteger('usuario_id');
            $t->unsignedBigInteger('tipo_cultivo_id');
            $t->decimal('rinde_tn_ha', 6, 2);
            $t->decimal('costo_directo_usd_ha', 10, 2);
            $t->decimal('costo_fertilizante_usd_ha', 10, 2)->default(0);
            $t->decimal('costo_comercial_pct', 5, 2)->default(0);
            $t->decimal('retencion_pct', 5, 2)->default(0);
            $t->timestamp('actualizado_en')->nullable();
            $t->unique(['usuario_id', 'tipo_cultivo_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('supuestos_margen');
    }
};
