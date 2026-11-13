<?php

namespace App\Proveedores;

interface ProveedorPrecios
{
    /**
     * @param  int[]  $tiposCultivo  ids a consultar; vacío = todos los configurados
     * @return CotizacionDto[] precios en USD por tonelada
     */
    public function obtener(array $tiposCultivo, \DateTimeInterface $fecha): array;
}
