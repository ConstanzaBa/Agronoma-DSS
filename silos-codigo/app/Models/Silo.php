<?php

namespace App\Models;

use App\Models\Concerns\FechasEs;
use Illuminate\Database\Eloquent\Model;

class Silo extends Model
{
    use FechasEs;

    protected $table = 'silos';
    protected $fillable = [
        'cuenta_id',
        'usuario_id',
        'establecimiento_id',
        'nombre',
        'tipo',
        'capacidad_tn',
        'tipo_cultivo_id',
        'humedad_grano_pct',
        'temperatura_nucleo_c',
        'temperatura_limite_c',
        'almacenado_desde',
    ];
    protected $casts = [
        'capacidad_tn' => 'float',
        'humedad_grano_pct' => 'float',
        'temperatura_nucleo_c' => 'float',
        'temperatura_limite_c' => 'float',
        'almacenado_desde' => 'date:Y-m-d',
    ];

    public function movimientos()
    {
        return $this->hasMany(Movimiento::class, 'silo_id');
    }

    /** Aislamiento por cuenta. */
    public function scopeDeLaCuenta($q, int $cuentaId)
    {
        return $q->where('cuenta_id', $cuentaId);
    }

    /**
     * Silos visibles para quien hace el pedido (atributos fijados por RequiereUsuario):
     * admin → toda su cuenta; empleado → solo la estancia que tiene asignada dentro de su cuenta.
     */
    public function scopeVisiblesPara($q, \Illuminate\Http\Request $request)
    {
        $q->where('cuenta_id', (int) $request->attributes->get('cuenta_id'));

        if (! $request->attributes->get('es_admin')) {
            $q->where('establecimiento_id', (int) $request->attributes->get('establecimiento_id'));
        }

        return $q;
    }
}
