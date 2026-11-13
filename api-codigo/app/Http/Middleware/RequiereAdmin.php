<?php

namespace App\Http\Middleware;

use App\Support\Respuesta;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class RequiereAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $identidad = $request->attributes->get('identidad');

        if (($identidad['rol'] ?? null) !== 'admin') {
            Log::warning('Acceso a una ruta de administrador sin el rol', [
                'usuario_id' => $identidad['usuario_id'] ?? null,
                'ruta' => $request->path(),
            ]);

            return Respuesta::error('sin_permiso', 'Esta operación es solo para administradores', 403);
        }

        return $next($request);
    }
}
