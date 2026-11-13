<?php

namespace App\Models;

use App\Models\Concerns\FechasEs;
use Illuminate\Database\Eloquent\Model;

class Silo extends Model
{
    use FechasEs;

    protected $table = 'silos';
    protected $fillable = [
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

    public function scopeDelUsuario($q, int $uid)
    {
        return $q->where('usuario_id', $uid);
    }
}
