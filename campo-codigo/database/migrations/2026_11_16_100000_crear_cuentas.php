<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cuentas', function (Blueprint $table) {
            $table->id();
            // Id lógico del usuario en Auth. Sin FK: Auth vive en otra base.
            $table->unsignedBigInteger('administrador_usuario_id')->unique();
            $table->string('estado', 20)->default('activa');
            $table->timestamp('creado_en')->nullable();
            $table->timestamp('actualizado_en')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cuentas');
    }
};
