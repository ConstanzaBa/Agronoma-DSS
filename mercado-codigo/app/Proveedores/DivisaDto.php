<?php

namespace App\Proveedores;

final class DivisaDto
{
    public function __construct(
        public readonly string $tipo,
        public readonly string $fecha,
        public readonly float $valor,
    ) {}
}
