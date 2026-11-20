<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('codigos_estancia', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cuenta_id')->constrained('cuentas')->cascadeOnDelete();
            $table->foreignId('establecimiento_id')->constrained('establecimientos_rurales')->cascadeOnDelete();
            $table->string('codigo', 32)->unique();
            $table->string('estado', 20)->default('activo'); // activo | usado | revocado
            $table->foreignId('empleado_id')->nullable()->constrained('empleados')->nullOnDelete();
            $table->timestamp('usado_en')->nullable();
            $table->timestamp('creado_en')->nullable();
            $table->timestamp('actualizado_en')->nullable();
            $table->index(['cuenta_id', 'estado']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('codigos_estancia');
    }
};
