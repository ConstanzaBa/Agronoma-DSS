<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ObjetivoPrecio extends Model
{
    const CREATED_AT = 'creado_en';
    const UPDATED_AT = 'actualizado_en';

    protected $table = 'objetivos_precio';
    protected $fillable = ['cuenta_id', 'usuario_id', 'tipo_cultivo_id', 'moneda', 'direccion', 'umbral', 'activo', 'ultimo_disparo_en'];
    protected $casts = ['umbral' => 'float', 'activo' => 'boolean', 'ultimo_disparo_en' => 'datetime'];

    /** Objetivos de la cuenta del admin (más los previos sin cuenta que creó él mismo). */
    public function scopeVisiblesPara($q, \Illuminate\Http\Request $request)
    {
        $cuenta = (int) $request->attributes->get('cuenta_id');
        $uid = (int) $request->attributes->get('usuario_id');

        return $q->where(fn($w) => $w->where('cuenta_id', $cuenta)
            ->orWhere(fn($l) => $l->whereNull('cuenta_id')->where('usuario_id', $uid)));
    }
}
