<?php

return [
    'gateway_secret' => env('GATEWAY_SECRET'),
    'silos_url' => env('SERVICIO_SILOS_URL'),
    'alertas_url' => env('SERVICIO_ALERTAS_URL'),
    'cola_driver' => env('COLA_DRIVER', 'database'),

    'precios_api_url' => env('PRECIOS_API_URL'),                // granos.ar
    'precios_api_key' => env('PRECIOS_API_KEY'),                // opcional en granos.ar
    'webhook_secret' => env('WEBHOOK_HMAC_SECRET'),
    'dolar_pesificacion' => env('DOLAR_PESIFICACION', 'oficial_bna'),
    'humedad_grano_max' => (float) env('HUMEDAD_GRANO_MAX', 14.0),

    // Los ids tienen que coincidir con campo.tipos_cultivo. clave_api es el nombre del grano en granos.ar
    // (maiz va sin tilde).
    'cultivos' => [
        ['id' => 1, 'nombre' => 'soja', 'clave_api' => 'soja'],
        ['id' => 2, 'nombre' => 'maíz', 'clave_api' => 'maiz'],
        ['id' => 3, 'nombre' => 'trigo', 'clave_api' => 'trigo'],
    ],
];
