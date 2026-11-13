<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RegistroClima extends Model
{
    public $timestamps = false;
    protected $table = 'registros_clima';
    protected $fillable = ['establecimiento_id', 'consultado_en', 'temperatura_c', 'humedad_pct', 'precipitacion_mm', 'viento_kmh', 'pronostico', 'fuente'];
    protected $casts = ['pronostico' => 'array', 'consultado_en' => 'datetime'];
}
