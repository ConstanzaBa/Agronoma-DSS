<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReglaAlerta extends Model
{
    public $timestamps = false;
    protected $table = 'reglas_alerta';
    protected $fillable = ['tipo', 'severidad', 'parametros', 'activa'];
    protected $casts = ['parametros' => 'array', 'activa' => 'boolean'];
}
