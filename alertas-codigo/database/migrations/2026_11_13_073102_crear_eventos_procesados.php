<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('eventos_procesados', function (Blueprint $t) {
            $t->id();
            $t->char('event_id', 36)->unique();
            $t->string('tipo', 40);
            $t->timestamp('procesado_en')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('eventos_procesados');
    }
};
