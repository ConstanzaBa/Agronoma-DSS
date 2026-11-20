<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class VerificarGatewaySecret
{
    public function handle(Request $request, Closure $next): Response
    {
        try {
            $esperado = (string) config('agrotech.gateway_secret');
            $recibido = (string) $request->header('X-Gateway-Secret', '');

            if ($esperado === '' || ! hash_equals($esperado, $recibido)) {
                Log::warning('Acceso rechazado por gateway secret', [
                    'ruta' => $request->path(),
                    'metodo' => $request->method(),
                ]);

                return response()->json([
                    'codigo' => 'acceso_directo',
                    'mensaje' => 'Acceso directo no permitido',
                ], 403);
            }

            return $next($request);
        } catch (Throwable $e) {
            Log::error('Error inesperado al verificar gateway secret', [
                'tipo' => get_class($e),
                'mensaje' => $e->getMessage(),
            ]);

            return response()->json([
                'codigo' => 'error_interno',
                'mensaje' => 'No se pudo verificar el acceso',
            ], 500);
        }
    }
}
