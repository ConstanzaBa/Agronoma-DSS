<?php

namespace App\Http\Middleware;

use App\Servicios\ProcesadorCola;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class ProcesarColaOcasional
{
    public function handle(Request $request, Closure $next): Response
    {
        return $next($request);
    }

    /** Se ejecuta cuando la respuesta ya se envió. */
    public function terminate(Request $request, Response $response): void
    {
        if ($request->is('api/v1/alertas/feed', 'api/v1/interno/*') || mt_rand(1, 10) !== 1) {
            return;
        }

        Log::info('Middleware de rescate: proceso los mensajes pendientes');
        app(ProcesadorCola::class)->drenar(10);
    }
}
