<?php

namespace App\Http\Middleware;

use App\Support\Respuesta;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class VerificarGatewaySecret
{
    public function handle(Request $request, Closure $next): Response
    {
        $esperado = (string) config('agrotech.gateway_secret');
        $recibido = (string) $request->header('X-Gateway-Secret', '');

        if ($esperado === '' || ! hash_equals($esperado, $recibido)) {
            Log::warning('Acceso directo bloqueado', ['ip' => $request->ip(), 'ruta' => $request->path()]);

            return Respuesta::error('acceso_directo', 'Acceso directo no permitido', 403);
        }

        return $next($request);
    }
}
