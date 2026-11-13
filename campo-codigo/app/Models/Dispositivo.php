<?php

namespace App\Models;

use App\Models\Concerns\FechasEs;
use Illuminate\Database\Eloquent\Model;

class Dispositivo extends Model
{
    use FechasEs;

    protected $table = 'dispositivos';
    protected $fillable = ['lote_id', 'nombre', 'identificador_unico', 'latitud', 'longitud', 'activo'];
    protected $casts = ['activo' => 'boolean', 'ultima_conexion_en' => 'datetime', 'ultima_secuencia' => 'integer'];

    public function lote()
    {
        return $this->belongsTo(Lote::class, 'lote_id');
    }
}
