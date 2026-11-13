<?php

namespace App\Proveedores;

use Illuminate\Support\Facades\Http;

class GranosArPrecios implements ProveedorPrecios
{
    public function obtener(array $tiposCultivo, \DateTimeInterface $fecha): array
    {
        $base = rtrim((string) config('agrotech.precios_api_url'), '/');
        $cabeceras = ['Accept' => 'application/json'];

        if ($clave = config('agrotech.precios_api_key')) {
            $cabeceras['X-API-Key'] = $clave;   // opcional: solo suma tu uso al contador
        }

        $r = Http::withHeaders($cabeceras)->timeout(3)->get("$base/pizarra");

        if (! $r->successful()) {
            throw new \RuntimeException('granos.ar respondió ' . $r->status());
        }

        // La documentación dice que el contenido viene dentro de "data"; acepto ambas formas.
        $granos = $r->json('data.granos') ?? $r->json('granos') ?? [];
        $resultado = [];

        foreach (config('agrotech.cultivos') as $c) {
            if ($tiposCultivo && ! in_array($c['id'], $tiposCultivo, true)) {
                continue;
            }

            $usd = $granos[$c['clave_api']]['usd_tn'] ?? null;

            if (! is_numeric($usd)) {
                continue;   // sin cotización ese día
            }

            // Se guarda con la fecha de la consulta, como el resto de la guía.
            $resultado[] = new CotizacionDto($c['id'], $fecha->format('Y-m-d'), round((float) $usd, 2), 'ROSARIO');
        }

        if (! $resultado) {
            throw new \RuntimeException('granos.ar no devolvió precios utilizables');
        }

        return $resultado;
    }
}
