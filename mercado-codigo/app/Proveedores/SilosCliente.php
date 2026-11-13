<?php

namespace App\Proveedores;

use Illuminate\Support\Facades\Http;

class SilosCliente
{
    public function resumen(int $siloId): ?array
    {
        return (new CircuitBreaker('silos'))->ejecutar(function () use ($siloId) {
            $r = Http::withHeaders([
                'X-Gateway-Secret' => config('agrotech.gateway_secret'),
                'Accept' => 'application/json',
            ])->timeout(3)->get(rtrim((string) config('agrotech.silos_url'), '/') . "/api/v1/interno/silos/{$siloId}/resumen");

            if ($r->status() === 404) {
                return null;
            }

            if (! $r->successful()) {
                throw new \RuntimeException('silos respondió ' . $r->status());
            }

            return $r->json();
        });
    }
}
