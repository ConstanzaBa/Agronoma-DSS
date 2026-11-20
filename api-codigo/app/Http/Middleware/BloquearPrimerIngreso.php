<?php

namespace App\Http\Middleware;

use App\Support\Respuesta;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/**
 * Mientras Auth informe primer_ingreso_pendiente=true para el token, solo se permite lo necesario para
 * completarlo. La regla de negocio es de Auth: acá solo se lee lo que Auth devolvió al validar el token.
 */
class BloquearPrimerIngreso
{
    /** método => rutas exactas permitidas (cualquier otra, incluso con variantes raras, se rechaza). */
    private const PERMITIDAS = [
        'GET' => ['v1/auth/me'],
        'POST' => ['v1/auth/primer-ingreso', 'v1/auth/logout'],
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $identidad = $request->attributes->get('identidad');

        if (($identidad['primer_ingreso_pendiente'] ?? false) !== true) {
            return $next($request);
        }

        if (in_array($request->path(), self::PERMITIDAS[$request->method()] ?? [], true)) {
            return $next($request);
        }

        Log::info('Acceso bloqueado: primer ingreso pendiente', ['usuario_id' => $identidad['usuario_id'] ?? null, 'ruta' => $request->path()]);

        return Respuesta::error('primer_ingreso_pendiente', 'Completá tu primer ingreso para continuar', 403);
    }
}
