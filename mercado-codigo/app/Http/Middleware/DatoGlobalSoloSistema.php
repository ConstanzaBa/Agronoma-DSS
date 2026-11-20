<?php

namespace App\Http\Middleware;

use App\Support\Respuesta;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/**
 * Cotizaciones, divisas e insumos son datos globales de mercado, compartidos por todas las cuentas
 * (y disparan avisos de precio en otras cuentas). Los actualizan los proveedores / el webhook firmado;
 * ninguna cuenta, ni siquiera su administrador, puede escribirlos.
 */
class DatoGlobalSoloSistema
{
    public function handle(Request $request, Closure $next): Response
    {
        Log::warning('Intento de escribir un dato global de mercado desde una cuenta', [
            'usuario_id' => $request->attributes->get('usuario_id'),
            'cuenta_id' => $request->attributes->get('cuenta_id'),
            'ruta' => $request->path(),
        ]);

        return Respuesta::error('dato_global', 'Los datos de mercado son globales y no se cargan desde una cuenta', 403);
    }
}
