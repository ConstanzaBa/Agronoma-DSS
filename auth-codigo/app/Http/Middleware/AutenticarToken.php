<?php

namespace App\Http\Middleware;

use App\Models\TokenAcceso;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class AutenticarToken
{
    public function handle(Request $request, Closure $next): Response
    {
        try {
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

            $registro->forceFill([
                'ultimo_uso_en' => now(),
            ])->save();

            $request->attributes->set('token_acceso', $registro);

            return $next($request);
        } catch (Throwable $e) {
            Log::error('Error inesperado en middleware de autenticación', [
                'tipo' => get_class($e),
                'mensaje' => $e->getMessage(),
            ]);

            return response()->json([
                'codigo' => 'error_interno',
                'mensaje' => 'No se pudo verificar la autenticación',
            ], 500);
        }
    }
}
