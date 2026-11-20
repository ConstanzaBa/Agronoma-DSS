<?php

namespace App\Http\Middleware;

use App\Support\Respuesta;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Estructura de silos (crear/editar): solo el administrador de la cuenta. Va después de 'usuario'. */
class RequiereAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->attributes->get('es_admin')) {
            return Respuesta::error('sin_permiso', 'Solo el administrador puede realizar esta acción', 403);
        }

        return $next($request);
    }
}
