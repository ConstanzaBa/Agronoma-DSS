<?php

namespace App\Eventos;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AlertasHttpPublicador implements PublicadorEventos
{
    public function publicar(string $routingKey, array $evento): bool
    {
        try {
            $r = Http::withHeaders([
                'X-Gateway-Secret' => config('agrotech.gateway_secret'),
                'Accept' => 'application/json',
            ])->connectTimeout(3)->timeout(3)->post(
                rtrim((string) config('agrotech.alertas_url'), '/') . '/api/v1/interno/eventos',
                ['routing_key' => $routingKey, 'evento' => $evento]
            );

            if ($r->successful()) {
                return true;
            }

            Log::error('alertas rechazó el evento', ['estado' => $r->status(), 'event_id' => $evento['event_id']]);
        } catch (\Throwable $e) {
            Log::error('No se pudo entregar el evento a alertas; el aviso se pierde', [
                'event_id' => $evento['event_id'],
                'error' => $e->getMessage(),
            ]);
        }

        return false;
    }
}
