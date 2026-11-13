<?php

namespace App\Clima;

interface ProveedorClima
{
    /** @return array{temperatura_c:?float,humedad_pct:?float,precipitacion_mm:?float,viento_kmh:?float,pronostico:array,fuente:string} */
    public function obtener(float $latitud, float $longitud): array;
}
