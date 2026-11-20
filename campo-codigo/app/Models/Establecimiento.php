<?php

namespace App\Models;

use App\Models\Concerns\FechasEs;
use App\Support\ContextoCuenta;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Establecimiento extends Model
{
    use FechasEs, SoftDeletes;

    protected $table = 'establecimientos_rurales';
    protected $fillable = ['cuenta_id', 'nombre', 'zona_administrativa', 'latitud_centro', 'longitud_centro', 'zoom'];
    protected $casts = ['latitud_centro' => 'float', 'longitud_centro' => 'float'];
    protected $hidden = ['eliminado_en'];

    public function getDeletedAtColumn(): string
    {
        return 'eliminado_en';
    }

    public function lotes()
    {
        return $this->hasMany(Lote::class, 'establecimiento_id');
    }

    public function cuenta()
    {
        return $this->belongsTo(Cuenta::class, 'cuenta_id');
    }

    /** Admin: todas las estancias de su cuenta. Empleado: solo la asignada. */
    public function scopeDelContexto($q, ContextoCuenta $c)
    {
        $q->where('cuenta_id', $c->cuentaId);

        return $c->esAdmin ? $q : $q->where('id', $c->establecimientoId);
    }
}
