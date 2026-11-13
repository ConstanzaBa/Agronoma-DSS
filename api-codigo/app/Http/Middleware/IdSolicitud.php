<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class IdSolicitud
{
    public function handle(Request $request, Closure $next): Response
    {
        $id = (string) Str::uuid();
        $request->attributes->set('id_solicitud', $id);
        Log::withContext(['id_solicitud' => $id]);

        $inicio = microtime(true);
        $respuesta = $next($request);
        $respuesta->headers->set('X-Request-Id', $id);

        Log::info('Pedido', [
            'metodo' => $request->method(),
            'ruta' => $request->path(),
            'estado' => $respuesta->getStatusCode(),
            'ms' => (int) round((microtime(true) - $inicio) * 1000),
        ]);

        return $respuesta;
    }
}
