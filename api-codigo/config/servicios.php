<?php

return [
    'secreto' => env('GATEWAY_SECRET'),
    'estado_para_admins' => (bool) env('ESTADO_PARA_ADMINS', false),
    'cors_origen' => env('CORS_ORIGEN', 'https://agronoma.site'),
    'token_ttl' => (int) env('TOKEN_CACHE_SEGUNDOS', 60),
    'token_ttl_dispositivo' => (int) env('TOKEN_CACHE_DISPOSITIVO_SEGUNDOS', 5),

    'servicios' => [
        'auth' => ['url' => env('SERVICIO_AUTH_URL'), 'timeout' => 3],
        'campo' => ['url' => env('SERVICIO_CAMPO_URL'), 'timeout' => 3],
        'silos' => ['url' => env('SERVICIO_SILOS_URL'), 'timeout' => 3],
        'mercado' => ['url' => env('SERVICIO_MERCADO_URL'), 'timeout' => 5],
        'alertas' => ['url' => env('SERVICIO_ALERTAS_URL'), 'timeout' => 3],
    ],

    'breaker' => [
        'umbral' => 5,              // fallos seguidos para abrir
        'segundos_abierto' => 30,   // tiempo abierto antes de dejar pasar una llamada de prueba
    ],

    'limites' => [
        'usuario' => (int) env('LIMITE_USUARIO', 120),
        'publico' => (int) env('LIMITE_PUBLICO', 10),
    ],
];