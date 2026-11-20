<?php

namespace App\Servicios;

use App\Excepciones\CampoNoDisponible;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/** Confirma con Campo (por su API interna, nunca por su base) que una estancia pertenece a una cuenta. */
class ValidadorEstancia
{
    /** @throws CampoNoDisponible si no se puede confirmar: jamás se asume que pertenece. */
    public function pertenece(int $establecimientoId, int $cuentaId): bool
    {
        try {
            $r = Http::withHeaders([
                'X-Gateway-Secret' => config('agrotech.gateway_secret'),
                'Accept' => 'application/json',
            ])->timeout(3)->get(
                rtrim((string) config('agrotech.campo_url'), '/') . "/api/v1/interno/establecimientos/{$establecimientoId}/pertenece/{$cuentaId}"
            );
        } catch (\Throwable $e) {
            Log::error('campo no respondió al validar la estancia', ['establecimiento_id' => $establecimientoId, 'error' => mb_substr($e->getMessage(), 0, 200)]);

            throw new CampoNoDisponible();
        }

        $pertenece = $r->json('pertenece');

        if (! $r->successful() || ! is_bool($pertenece)) {
            Log::error('Respuesta inesperada de campo al validar la estancia', ['establecimiento_id' => $establecimientoId, 'estado' => $r->status()]);

            throw new CampoNoDisponible();
        }

        return $pertenece;
    }
}
