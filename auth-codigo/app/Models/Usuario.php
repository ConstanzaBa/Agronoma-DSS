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

    protected $hidden = ['contrasena', 'cuenta_id']; // cuenta_id solo se expone por la API interna

    protected $casts = [
        'contrasena' => 'hashed',
        'activo' => 'boolean',
        'primer_ingreso_pendiente' => 'boolean',
    ];
}
