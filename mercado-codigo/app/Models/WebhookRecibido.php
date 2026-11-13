<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WebhookRecibido extends Model
{
    public $timestamps = false;
    protected $table = 'webhooks_recibidos';
    protected $fillable = ['event_id', 'proveedor', 'payload', 'procesado', 'recibido_en'];
    protected $casts = ['payload' => 'array', 'procesado' => 'boolean', 'recibido_en' => 'datetime'];
}
