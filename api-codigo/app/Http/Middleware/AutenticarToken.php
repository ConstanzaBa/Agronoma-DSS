<?php

namespace App\Http\Middleware;

use App\Excepciones\ServicioNoDisponible;
use App\Excepciones\TokenInvalido;
use App\Servicios\ValidadorToken;
use App\Support\Respuesta;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class AutenticarToken
{
    public function __construct(private ValidadorToken $validador) {}

    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();

        if (! $token) {
            Log::info('Pedido sin token', ['ruta' => $request->path()]);

            return Respuesta::error('no_autenticado', 'Falta el token', 401);
        }

        try {
            $identidad = $this->validador->identidad($token);
        } catch (TokenInvalido $e) {
            Log::info('Token inválido o vencido', ['ruta' => $request->path()]);

            return Respuesta::error('no_autenticado', 'Token inválido o vencido', 401);
        } catch (ServicioNoDisponible $e) {
            Log::error('No se pudo validar el token: auth no responde');

            return Respuesta::error('servicio_no_disponible', 'No se pudo validar el token', 503);
        }

        $request->attributes->set('identidad', $identidad);
        $request->attributes->set('token', $token);

        return $next($request);
    }
}
