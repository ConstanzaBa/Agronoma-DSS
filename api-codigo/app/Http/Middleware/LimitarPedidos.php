<?php

namespace App\Http\Middleware;

use App\Support\Respuesta;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Symfony\Component\HttpFoundation\Response;

class LimitarPedidos
{
    public function handle(Request $request, Closure $next, string $grupo = 'usuario'): Response
    {
        $identidad = $request->attributes->get('identidad');
        $quien = $identidad
            ? 'u:' . ($identidad['autenticable'] ?? 'usuario') . ':' . ($identidad['autenticable_id'] ?? '0')
            : 'ip:' . $request->ip();

        $llave = "limite:$grupo:$quien";
        $maximo = (int) config("servicios.limites.$grupo");

        if (RateLimiter::tooManyAttempts($llave, $maximo)) {
            $espera = RateLimiter::availableIn($llave);
            Log::warning('Rate limit superado', ['grupo' => $grupo, 'quien' => $quien, 'espera_s' => $espera]);

            return Respuesta::error('demasiadas_solicitudes', 'Demasiados pedidos: esperá un momento', 429)
                ->header('Retry-After', (string) $espera);
        }

        RateLimiter::hit($llave, 60);

        return $next($request);
    }
}
