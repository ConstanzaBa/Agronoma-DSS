<?php

namespace App\Http\Middleware;

use App\Support\Respuesta;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class RequiereSensor
{
    public function handle(Request $request, Closure $next): Response
    {
        $tipo = (string) $request->header('X-Autenticable-Tipo', '');
        $id = (string) $request->header('X-Autenticable-Id', '');

        if ($tipo !== 'dispositivo' || ! ctype_digit($id) || (int) $id < 1) {
            Log::warning('Pedido de sensor sin identidad de dispositivo', ['tipo' => $tipo, 'ruta' => $request->path()]);

            return Respuesta::error('sin_permiso', 'Esta ruta es solo para sensores', 403);
        }

        $request->attributes->set('dispositivo_id', (int) $id);

        return $next($request);
    }
}
