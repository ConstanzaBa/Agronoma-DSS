<?php

return [
    'gateway_secret' => env('GATEWAY_SECRET'),
    'auth_url' => env('SERVICIO_AUTH_URL'),
    'alertas_url' => env('SERVICIO_ALERTAS_URL'),
    'cola_driver' => env('COLA_DRIVER', 'database'),
    'humedad_critica' => (float) env('HUMEDAD_CRITICA', 15),
    'humedad_advertencia' => (float) env('HUMEDAD_ADVERTENCIA', 25),
];
