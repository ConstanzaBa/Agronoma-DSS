<?php

namespace App\Proveedores;

final class CotizacionDto
{
    public function __construct(
        public readonly int $tipoCultivoId,
        public readonly string $fecha,
        public readonly float $precioUsdTn,
        public readonly string $mercadoReferencia,
    ) {}
}
