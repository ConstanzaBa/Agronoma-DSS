<?php

namespace App\Http\Middleware;

use App\Support\ContextoCuenta;
use App\Support\Respuesta;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequiereAdminCuenta
{
    public function handle(Request $request, Closure $next): Response
    {
        $contexto = $request->attributes->get('contexto');

        if (! $contexto instanceof ContextoCuenta || ! $contexto->esAdmin) {
            return Respuesta::error('sin_permiso', 'Solo el administrador de la cuenta puede hacer esto', 403);
        }

        return $next($request);
    }
}
