<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('webhooks_recibidos', function (Blueprint $t) {
            $t->id();
            $t->string('event_id', 64)->unique();
            $t->string('proveedor', 40);
            $t->json('payload');
            $t->boolean('procesado')->default(false);
            $t->timestamp('recibido_en')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('webhooks_recibidos');
    }
};
