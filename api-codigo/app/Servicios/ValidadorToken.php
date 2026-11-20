<?php

namespace App\Servicios;

use App\Excepciones\ServicioNoDisponible;
use App\Excepciones\TokenInvalido;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ValidadorToken
{
    /** @return array{usuario_id:?int,autenticable:string,autenticable_id:int,rol:?string,permisos:?array} */
    public function identidad(string $token): array
    {
        $clave = $this->clave($token);

        if ($enCache = Cache::get($clave)) {
            return $enCache;
        }

        $breaker = new CircuitBreaker('auth');

        if (! $breaker->permitido()) {
            throw new ServicioNoDisponible('auth');
        }

        try {
            $r = Http::withHeaders([
                'X-Gateway-Secret' => config('servicios.secreto'),
                'Accept' => 'application/json',
            ])->timeout((int) config('servicios.servicios.auth.timeout'))->post(
                rtrim((string) config('servicios.servicios.auth.url'), '/') . '/api/v1/interno/tokens/validar',
                ['token' => $token]
            );
        } catch (\Throwable $e) {
            $breaker->fallo();
            Log::error('auth no respondió al validar un token', ['error' => $e->getMessage()]);

            throw new ServicioNoDisponible('auth');
        }

        if ($r->status() >= 500) {
            $breaker->fallo();

            throw new ServicioNoDisponible('auth');
        }

        $breaker->exito();

        if (! $r->successful()) {
            throw new TokenInvalido();
        }

        $identidad = $r->json();
        // Los tokens de dispositivo se cachean poco tiempo: al regenerarse en auth, el viejo deja de servir casi enseguida.
        $ttl = ($identidad['autenticable'] ?? null) === 'dispositivo'
            ? (int) config('servicios.token_ttl_dispositivo')
            : (int) config('servicios.token_ttl');
        Cache::put($clave, $identidad, $ttl);

        return $identidad;
    }

    public function olvidar(string $token): void
    {
        Cache::forget($this->clave($token));
    }

    private function clave(string $token): string
    {
        return 'token:' . hash('sha256', $token);
    }
}
