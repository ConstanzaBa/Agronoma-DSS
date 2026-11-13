<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cotizaciones_granos', function (Blueprint $t) {
            $t->id();
            $t->unsignedBigInteger('tipo_cultivo_id');                    // ref. lógica a campo
            $t->date('fecha_cotizacion');
            $t->decimal('precio_usd_tn', 10, 2);
            $t->decimal('precio_ars_tn', 14, 2)->nullable();
            $t->string('mercado_referencia', 12);                         // CBOT | ROSARIO
            $t->string('fuente', 10);                                     // api | manual | webhook
            $t->unsignedBigInteger('creado_por')->nullable();             // ref. lógica a auth
            $t->timestamp('creado_en')->nullable();
            $t->unique(
                ['tipo_cultivo_id', 'fecha_cotizacion', 'fuente'],
                'uq_cot_grano_fecha_fuente'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cotizaciones_granos');
    }
};
