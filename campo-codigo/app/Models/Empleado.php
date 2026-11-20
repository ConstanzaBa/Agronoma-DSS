<?php

namespace App\Models;

use App\Models\Concerns\FechasEs;
use Illuminate\Database\Eloquent\Model;

class Empleado extends Model
{
    use FechasEs;

    /** Roles de empleado válidos (el mismo catálogo que valida Auth; nunca admin). */
    public const ROLES = ['productor', 'ingeniero_agronomo', 'asesor_tecnico', 'contratista', 'otro'];

    protected $table = 'empleados';
    protected $fillable = ['cuenta_id', 'usuario_id', 'rol', 'estado'];

    public function cuenta()
    {
        return $this->belongsTo(Cuenta::class, 'cuenta_id');
    }

    public function asignaciones()
    {
        return $this->hasMany(Asignacion::class, 'empleado_id');
    }
}
