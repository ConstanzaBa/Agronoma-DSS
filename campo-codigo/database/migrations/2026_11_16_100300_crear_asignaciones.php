<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('asignaciones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empleado_id')->constrained('empleados')->cascadeOnDelete();
            $table->foreignId('establecimiento_id')->constrained('establecimientos_rurales')->cascadeOnDelete();
            $table->string('estado', 20)->default('activa');
            $table->timestamp('creado_en')->nullable();
            $table->timestamp('actualizado_en')->nullable();
            $table->index(['empleado_id', 'estado']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('asignaciones');
    }
};
