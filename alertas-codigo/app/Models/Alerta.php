<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Alerta extends Model
{
    public $timestamps = false;
    protected $table = 'alertas';
    protected $fillable = [
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

    public function scopeDelUsuario($q, int $uid)
    {
        return $q->where('usuario_id', $uid);
    }
}
