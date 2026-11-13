<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class Cors
{
    public function handle(Request $request, Closure $next): Response
    {
        $origen = (string) $request->header('Origin', '');
        $permitidos = array_map('trim', explode(',', (string) config('servicios.cors_origen')));
        $acepta = $origen !== '' && in_array($origen, $permitidos, true);

        if ($origen !== '' && ! $acepta) {
            Log::warning('Origen no permitido por CORS', ['origen' => $origen]);
        }

        $respuesta = $request->isMethod('OPTIONS') ? response('', 204) : $next($request);

        if ($acepta) {
            $respuesta->headers->set('Access-Control-Allow-Origin', $origen);
            $respuesta->headers->set('Vary', 'Origin');
            $respuesta->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
            $respuesta->headers->set('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept, Last-Event-ID');
            $respuesta->headers->set('Access-Control-Expose-Headers', 'X-Request-Id, Retry-After');
            $respuesta->headers->set('Access-Control-Max-Age', '600');
        }

        return $respuesta;
    }
}
