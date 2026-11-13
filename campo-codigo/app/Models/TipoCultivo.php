<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TipoCultivo extends Model
{
    public $timestamps = false;
    protected $table = 'tipos_cultivo';
    protected $fillable = ['nombre', 'limite_humedad_pct', 'dias_almacenamiento_seguro'];
    protected $casts = ['limite_humedad_pct' => 'float'];
}
