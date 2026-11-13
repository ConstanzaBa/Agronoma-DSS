<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PrecioInsumo extends Model
{
    const CREATED_AT = 'creado_en';
    const UPDATED_AT = null;

    protected $table = 'precios_insumos';
    protected $fillable = ['insumo', 'fecha', 'precio_usd', 'unidad', 'fuente', 'creado_por'];
    protected $casts = ['fecha' => 'date:Y-m-d', 'precio_usd' => 'float'];
}
