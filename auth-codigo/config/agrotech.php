<?php

return [
    'gateway_secret' => env('GATEWAY_SECRET'),
    'campo_url' => env('SERVICIO_CAMPO_URL'),
    // Bandeja simulada visible desde la demo (apagada por defecto).
    'demo_correo' => (bool) env('DEMO_CORREO_SIMULADO', false),
];
