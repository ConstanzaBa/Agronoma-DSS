<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Usuario extends Model
{
    const CREATED_AT = 'creado_en';
    const UPDATED_AT = 'actualizado_en';

    protected $table = 'usuarios';

    protected $fillable = [
        'nombre',
        'apellido',
        'correo',
        'contrasena',
        'rol',
        'profesion',
        'telefono',
        'activo',
    ];

    protected $hidden = ['contrasena'];

    protected $casts = [
        'contrasena' => 'hashed',
        'activo' => 'boolean',
    ];
}
