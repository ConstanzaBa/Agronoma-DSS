<?php

namespace App\Http\Middleware;

use App\Models\TokenAcceso;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AutenticarToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $plano = $request->bearerToken();
        $registro = $plano
            ? TokenAcceso::where('token', hash('sha256', $plano))->first()
            : null;

        if (! $registro || ($registro->expira_en && $registro->expira_en->isPast())) {
            return response()->json([
                'codigo' => 'no_autenticado',
                'mensaje' => 'Token faltante, inválido o vencido',
            ], 401);
        }

        $registro->forceFill(['ultimo_uso_en' => now()])->save();
        $request->attributes->set('token_acceso', $registro);

        return $next($request);
    }
}
