<?php

return [
    'gateway_secret' => env('GATEWAY_SECRET'),
    'alertas_url' => env('SERVICIO_ALERTAS_URL'),
    'cola_driver' => env('COLA_DRIVER', 'database'),
];
