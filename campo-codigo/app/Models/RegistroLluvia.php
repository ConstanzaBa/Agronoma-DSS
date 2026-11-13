<?php

namespace App\Models;

use App\Models\Concerns\FechasEs;
use Illuminate\Database\Eloquent\Model;

class RegistroLluvia extends Model
{
    use FechasEs;

    protected $table = 'registros_lluvia';
    protected $fillable = ['lote_id', 'usuario_id', 'milimetros', 'fecha_registro', 'observacion', 'clave_idempotencia'];
    protected $casts = ['milimetros' => 'float', 'fecha_registro' => 'date:Y-m-d'];

    public function getUpdatedAtColumn(): ?string
    {
        return null;
    }
}
