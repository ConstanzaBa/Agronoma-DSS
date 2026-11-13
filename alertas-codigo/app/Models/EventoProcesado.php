<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EventoProcesado extends Model
{
    public $timestamps = false;
    protected $table = 'eventos_procesados';
    protected $fillable = ['event_id', 'tipo', 'procesado_en'];
}
