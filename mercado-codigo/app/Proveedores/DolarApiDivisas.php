<?php

namespace App\Proveedores;

use Illuminate\Support\Facades\Http;

class DolarApiDivisas implements ProveedorDivisas
{
    public function obtener(\DateTimeInterface $fecha): array
    {
        $r = Http::timeout(3)->get('https://dolarapi.com/v1/dolares/oficial');

        if (! $r->successful() || ! is_numeric($r->json('venta'))) {
            throw new \RuntimeException('DolarAPI respondió ' . $r->status());
        }

        // Se guarda con la fecha de la consulta, no con fechaActualizacion del proveedor.
        return [new DivisaDto('oficial_bna', $fecha->format('Y-m-d'), (float) $r->json('venta'))];
    }
}
