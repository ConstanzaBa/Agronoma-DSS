<?php

namespace App\Http\Middleware;

use App\Support\Respuesta;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class RequiereUsuario
{
    public function handle(Request $request, Closure $next): Response
    {
        $id = (string) $request->header('X-Usuario-Id', '');

        if (! ctype_digit($id) || (int) $id < 1) {
            Log::warning('Pedido sin X-Usuario-Id válido', ['ruta' => $request->path()]);

            return Respuesta::error('no_autenticado', 'Falta la identidad del usuario', 401);
        }

        $request->attributes->set('usuario_id', (int) $id);

        return $next($request);
    }
}
