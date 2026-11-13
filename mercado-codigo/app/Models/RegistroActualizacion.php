<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RegistroActualizacion extends Model
{
    public $timestamps = false;
    protected $table = 'registro_actualizaciones';
    protected $fillable = ['recurso', 'proveedor', 'intentado_en', 'ok', 'detalle'];
    protected $casts = ['ok' => 'boolean', 'intentado_en' => 'datetime'];
}
