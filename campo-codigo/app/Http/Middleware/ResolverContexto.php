<?php

namespace App\Http\Middleware;

use App\Support\ResolutorContexto;
use App\Support\Respuesta;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/**
 * Resuelve el contexto con la base de Campo. X-Usuario-Rol no se usa: la autoridad es la pertenencia local.
 * Debe ir después de RequiereUsuario.
 */
class ResolverContexto
{
    public function handle(Request $request, Closure $next): Response
    {
        $uid = (int) $request->attributes->get('usuario_id');

        $contexto = app(ResolutorContexto::class)->resolver($uid);

        if (! $contexto) {
            Log::warning('Usuario sin cuenta o sin asignación activa', ['usuario_id' => $uid, 'ruta' => $request->path()]);

            return Respuesta::error('sin_cuenta', 'El usuario no pertenece a ninguna cuenta', 403);
        }

        $request->attributes->set('contexto', $contexto);

        return $next($request);
    }
}
