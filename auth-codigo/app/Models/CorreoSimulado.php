<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CorreoSimulado extends Model
{
    public $timestamps = false;

    protected $table = 'correos_simulados';
    protected $fillable = ['destinatario', 'asunto', 'cuerpo', 'enviado_en', 'token_lectura'];
    protected $casts = ['enviado_en' => 'datetime'];
}
