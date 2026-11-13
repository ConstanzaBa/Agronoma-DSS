<?php

namespace App\Models;

use App\Models\Concerns\FechasEs;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Establecimiento extends Model
{
    use FechasEs, SoftDeletes;

    protected $table = 'establecimientos_rurales';
    protected $fillable = ['usuario_id', 'nombre', 'zona_administrativa', 'latitud_centro', 'longitud_centro', 'zoom'];
    protected $casts = ['latitud_centro' => 'float', 'longitud_centro' => 'float'];
    protected $hidden = ['eliminado_en'];

    public function getDeletedAtColumn(): string
    {
        return 'eliminado_en';
    }

    public function lotes()
    {
        return $this->hasMany(Lote::class, 'establecimiento_id');
    }

    public function scopeDelUsuario($q, int $uid)
    {
        return $q->where('usuario_id', $uid);
    }
}
