<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SupuestoMargen extends Model
{
    const CREATED_AT = null;
    const UPDATED_AT = 'actualizado_en';

    protected $table = 'supuestos_margen';
    protected $fillable = ['cuenta_id', 'usuario_id', 'tipo_cultivo_id', 'rinde_tn_ha', 'costo_directo_usd_ha', 'costo_fertilizante_usd_ha', 'costo_comercial_pct', 'retencion_pct'];
    protected $casts = [
        'rinde_tn_ha' => 'float',
        'costo_directo_usd_ha' => 'float',
        'costo_fertilizante_usd_ha' => 'float',
        'costo_comercial_pct' => 'float',
        'retencion_pct' => 'float',
    ];

    /** Supuestos de la cuenta (más los previos sin cuenta que cargó el propio usuario). */
    public function scopeDeCuenta($q, int $cuentaId, int $usuarioId)
    {
        return $q->where(fn($w) => $w->where('cuenta_id', $cuentaId)
            ->orWhere(fn($l) => $l->whereNull('cuenta_id')->where('usuario_id', $usuarioId)));
    }
}
