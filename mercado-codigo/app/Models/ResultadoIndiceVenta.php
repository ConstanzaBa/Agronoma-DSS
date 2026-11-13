<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ResultadoIndiceVenta extends Model
{
    public $timestamps = false;
    protected $table = 'resultados_indice_venta';
    protected $fillable = ['usuario_id', 'silo_id', 'puntaje', 'veredicto', 'reglas_aplicadas', 'calculado_en'];
    protected $casts = ['reglas_aplicadas' => 'array', 'calculado_en' => 'datetime', 'puntaje' => 'integer'];
}
