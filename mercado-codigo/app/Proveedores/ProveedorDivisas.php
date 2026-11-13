<?php

namespace App\Proveedores;

interface ProveedorDivisas
{
    /** @return DivisaDto[] */
    public function obtener(\DateTimeInterface $fecha): array;
}
