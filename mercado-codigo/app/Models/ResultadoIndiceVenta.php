<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ResultadoIndiceVenta extends Model
{
    public $timestamps = false;
    protected $table = 'resultados_indice_venta';
    protected $fillable = ['cuenta_id', 'usuario_id', 'silo_id', 'puntaje', 'veredicto', 'reglas_aplicadas', 'calculado_en'];
    protected $casts = ['reglas_aplicadas' => 'array', 'calculado_en' => 'datetime', 'puntaje' => 'integer'];

    public function scopeDeCuenta($q, int $cuentaId, int $usuarioId)
    {
        return $q->where(fn($w) => $w->where('cuenta_id', $cuentaId)
            ->orWhere(fn($l) => $l->whereNull('cuenta_id')->where('usuario_id', $usuarioId)));
    }
}
