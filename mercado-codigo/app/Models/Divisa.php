<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Divisa extends Model
{
    const CREATED_AT = 'creado_en';
    const UPDATED_AT = null;

    protected $table = 'cotizaciones_divisas';
    protected $fillable = ['fecha', 'tipo', 'valor_ars_usd', 'fuente'];
    protected $casts = ['fecha' => 'date:Y-m-d', 'valor_ars_usd' => 'float'];
}
