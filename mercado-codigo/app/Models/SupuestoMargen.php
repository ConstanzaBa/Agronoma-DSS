<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SupuestoMargen extends Model
{
    const CREATED_AT = null;
    const UPDATED_AT = 'actualizado_en';

    protected $table = 'supuestos_margen';
    protected $fillable = ['usuario_id', 'tipo_cultivo_id', 'rinde_tn_ha', 'costo_directo_usd_ha', 'costo_fertilizante_usd_ha', 'costo_comercial_pct', 'retencion_pct'];
    protected $casts = [
        'rinde_tn_ha' => 'float',
        'costo_directo_usd_ha' => 'float',
        'costo_fertilizante_usd_ha' => 'float',
        'costo_comercial_pct' => 'float',
        'retencion_pct' => 'float',
    ];
}
