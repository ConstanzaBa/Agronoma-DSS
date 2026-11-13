<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tipos_cultivo', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 40)->unique();
            $table->decimal('limite_humedad_pct', 4, 1)->nullable();
            $table->smallInteger('dias_almacenamiento_seguro')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tipos_cultivo');
    }
};
