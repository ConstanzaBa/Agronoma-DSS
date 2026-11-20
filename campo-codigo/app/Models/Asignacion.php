<?php

namespace App\Models;

use App\Models\Concerns\FechasEs;
use Illuminate\Database\Eloquent\Model;

class Asignacion extends Model
{
    use FechasEs;

    protected $table = 'asignaciones';
    protected $fillable = ['empleado_id', 'establecimiento_id', 'estado'];

    public function empleado()
    {
        return $this->belongsTo(Empleado::class, 'empleado_id');
    }

    public function establecimiento()
    {
        return $this->belongsTo(Establecimiento::class, 'establecimiento_id');
    }
}
