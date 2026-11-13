<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TokenAcceso extends Model
{
    const CREATED_AT = 'creado_en';
    const UPDATED_AT = 'actualizado_en';

    protected $table = 'tokens_acceso';

    protected $fillable = [
        'tipo_autenticable',
        'autenticable_id',
        'nombre',
        'token',
        'permisos',
        'ultimo_uso_en',
        'expira_en',
    ];

    protected $casts = [
        'permisos' => 'array',
        'ultimo_uso_en' => 'datetime',
        'expira_en' => 'datetime',
    ];
}
