<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('establecimientos_rurales', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('usuario_id')->index();
            $table->string('nombre', 120);
            $table->string('zona_administrativa', 150)->nullable();
            $table->decimal('latitud_centro', 10, 7);
            $table->decimal('longitud_centro', 10, 7);
            $table->unsignedTinyInteger('zoom')->default(13);
            $table->timestamp('creado_en')->nullable();
            $table->timestamp('actualizado_en')->nullable();
            $table->timestamp('eliminado_en')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('establecimientos_rurales');
    }
};
