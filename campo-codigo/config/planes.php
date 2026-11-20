<?php

/**
 * Catálogo de planes y sus límites (null = sin límite).
 * VALORES PROVISORIOS: el diseño deja pendiente la definición exacta; se ajustan acá sin tocar código.
 */
return [
    'core' => ['estancias' => 1, 'lotes' => 5, 'sensores' => 10, 'empleados' => 2],
    'pro' => ['estancias' => 5, 'lotes' => 50, 'sensores' => 100, 'empleados' => 10],
    'enterprise' => ['estancias' => null, 'lotes' => null, 'sensores' => null, 'empleados' => null],
];
