<?php

namespace App\Models;

use App\Models\Concerns\FechasEs;
use App\Support\ContextoCuenta;
use Illuminate\Database\Eloquent\Model;

class Lote extends Model
{
    use FechasEs;

    protected $table = 'lotes';
    protected $fillable = ['establecimiento_id', 'nombre', 'coordenadas', 'superficie_ha', 'tipo_cultivo_id', 'variedad', 'estado', 'ultima_humedad_suelo_pct'];
    protected $casts = ['coordenadas' => 'array', 'superficie_ha' => 'float', 'ultima_humedad_suelo_pct' => 'float'];

    public function establecimiento()
    {
        return $this->belongsTo(Establecimiento::class, 'establecimiento_id');
    }

    public function dispositivos()
    {
        return $this->hasMany(Dispositivo::class, 'lote_id');
    }

    public function scopeDelContexto($q, ContextoCuenta $c)
    {
        return $q->whereHas('establecimiento', fn($e) => $e->delContexto($c));
    }
}
