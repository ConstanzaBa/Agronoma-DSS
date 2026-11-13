<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CotizacionGrano extends Model
{
    const CREATED_AT = 'creado_en';
    const UPDATED_AT = null;

    protected $table = 'cotizaciones_granos';
    protected $fillable = ['tipo_cultivo_id', 'fecha_cotizacion', 'precio_usd_tn', 'precio_ars_tn', 'mercado_referencia', 'fuente', 'creado_por'];
    protected $casts = ['fecha_cotizacion' => 'date:Y-m-d', 'precio_usd_tn' => 'float', 'precio_ars_tn' => 'float'];
}
