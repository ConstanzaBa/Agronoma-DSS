<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Alerta extends Model
{
    public $timestamps = false;
    protected $table = 'alertas';
    protected $fillable = [
        'cuenta_id',
        'establecimiento_id',
        'usuario_id',
        'regla_id',
        'tipo',
        'severidad',
        'lote_id',
        'silo_id',
        'titulo',
        'mensaje',
        'datos',
        'estado',
        'activada_en',
        'atendida_en',
        'resuelta_en',
    ];
    protected $casts = [
        'datos' => 'array',
        'activada_en' => 'datetime',
        'atendida_en' => 'datetime',
        'resuelta_en' => 'datetime',
    ];

    /**
     * Alertas visibles para quien hace el pedido (identidad fijada por RequiereUsuario):
     *  - admin: las de su cuenta; además las previas sin cuenta que generó su propio usuario (compatibilidad).
     *  - empleado: solo las de su cuenta y su estancia (sin estancia registrada → no se ven).
     */
    public function scopeVisiblesPara($q, \Illuminate\Http\Request $request)
    {
        $cuenta = (int) $request->attributes->get('cuenta_id');

        if ($request->attributes->get('es_admin')) {
            $uid = (int) $request->attributes->get('usuario_id');

            return $q->where(fn($w) => $w->where('cuenta_id', $cuenta)
                ->orWhere(fn($l) => $l->whereNull('cuenta_id')->where('usuario_id', $uid)));
        }

        return $q->where('cuenta_id', $cuenta)
            ->where('establecimiento_id', (int) $request->attributes->get('establecimiento_id'));
    }
}
