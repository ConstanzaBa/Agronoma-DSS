<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tokens_acceso', function (Blueprint $table) {
            $table->id();
            $table->string('tipo_autenticable');
            $table->unsignedBigInteger('autenticable_id');
            $table->string('nombre');
            $table->string('token', 64)->unique();
            $table->text('permisos')->nullable();
            $table->timestamp('ultimo_uso_en')->nullable();
            $table->timestamp('expira_en')->nullable();
            $table->timestamp('creado_en')->nullable();
            $table->timestamp('actualizado_en')->nullable();
            $table->index(['tipo_autenticable', 'autenticable_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tokens_acceso');
    }
};
