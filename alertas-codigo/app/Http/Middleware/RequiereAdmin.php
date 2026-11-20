<?php

namespace App\Http\Middleware;

use App\Support\Respuesta;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/** Solo el administrador de la cuenta. Va después de 'usuario' (que fija la identidad). */
class RequiereAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->attributes->get('es_admin')) {
            Log::warning('Operación de administrador sin rol admin', [
                'usuario_id' => $request->attributes->get('usuario_id'),
                'ruta' => $request->path(),
            ]);

            return Respuesta::error('sin_permiso', 'Esta operación es solo para administradores', 403);
        }

        return $next($request);
    }
}
