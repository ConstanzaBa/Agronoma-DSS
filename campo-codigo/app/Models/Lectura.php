<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Lectura extends Model
{
    public $timestamps = false;
    protected $table = 'lecturas_sensores';
    protected $fillable = ['dispositivo_id', 'lote_id', 'secuencia', 'humedad_suelo_pct', 'humedad_aire_pct', 'temperatura_c', 'precipitacion_mm', 'medido_en', 'recibido_en'];
    protected $casts = [
        'humedad_suelo_pct' => 'float',
        'humedad_aire_pct' => 'float',
        'temperatura_c' => 'float',
        'precipitacion_mm' => 'float',
        'medido_en' => 'datetime',
        'recibido_en' => 'datetime',
    ];
}
