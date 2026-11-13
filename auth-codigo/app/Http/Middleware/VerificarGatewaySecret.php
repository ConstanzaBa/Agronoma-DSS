<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerificarGatewaySecret
{
    public function handle(Request $request, Closure $next): Response
    {
        $esperado = (string) config('agrotech.gateway_secret');
        $recibido = (string) $request->header('X-Gateway-Secret', '');

        if ($esperado === '' || ! hash_equals($esperado, $recibido)) {
            return response()->json([
                'codigo' => 'acceso_directo',
                'mensaje' => 'Acceso directo no permitido',
            ], 403);
        }

        return $next($request);
    }
}
