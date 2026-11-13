<?php

namespace App\Models;

use App\Models\Concerns\FechasEs;
use Illuminate\Database\Eloquent\Model;

class Movimiento extends Model
{
    use FechasEs;

    protected $table = 'movimientos_silo';
    protected $fillable = ['silo_id', 'usuario_id', 'direccion', 'toneladas', 'fecha_movimiento', 'observacion', 'clave_idempotencia'];
    protected $casts = ['toneladas' => 'float', 'fecha_movimiento' => 'date:Y-m-d'];

    public function getUpdatedAtColumn(): ?string
    {
        return null;
    }
}
