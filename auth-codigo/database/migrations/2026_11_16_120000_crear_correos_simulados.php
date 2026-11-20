<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Bandeja de correo simulada (demo). Reemplazable por un envío real sin tocar el resto.
        Schema::create('correos_simulados', function (Blueprint $table) {
            $table->id();
            $table->string('destinatario', 150)->index();
            $table->string('asunto', 150);
            $table->text('cuerpo');
            $table->timestamp('enviado_en')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('correos_simulados');
    }
};
