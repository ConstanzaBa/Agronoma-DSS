<?php

return [
    'gateway_secret' => env('GATEWAY_SECRET'),
    'auth_url' => env('SERVICIO_AUTH_URL'),
    'cola_driver' => env('COLA_DRIVER', 'database'),

    'correo_activo' => (bool) env('CORREO_ACTIVO', false),
    'correo_severidades' => array_values(array_filter(array_map('trim', explode(',', (string) env('CORREO_SEVERIDADES', 'critical'))))),

    // Los ids tienen que coincidir con campo.tipos_cultivo.
    'cultivos' => [1 => 'soja', 2 => 'maíz', 3 => 'trigo'],
];
