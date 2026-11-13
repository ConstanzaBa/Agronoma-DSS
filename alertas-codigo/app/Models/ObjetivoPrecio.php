<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ObjetivoPrecio extends Model
{
    const CREATED_AT = 'creado_en';
    const UPDATED_AT = 'actualizado_en';

    protected $table = 'objetivos_precio';
    protected $fillable = ['usuario_id', 'tipo_cultivo_id', 'moneda', 'direccion', 'umbral', 'activo', 'ultimo_disparo_en'];
    protected $casts = ['umbral' => 'float', 'activo' => 'boolean', 'ultimo_disparo_en' => 'datetime'];
}
