<?php

namespace App\Http\Middleware;

use App\Support\Respuesta;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/**
 * Identidad construida por el Gateway (el cliente nunca decide pertenencia ni permisos):
 *   X-Usuario-Id          usuario autenticado
 *   X-Cuenta-Id           cuenta del usuario (límite de aislamiento)
 *   X-Usuario-Rol         admin | productor | ingeniero_agronomo | asesor_tecnico | contratista | otro
 *   X-Establecimiento-Id  estancia asignada; obligatoria para empleados, ignorada para admin
 */
class RequiereUsuario
{
    public const ROLES_EMPLEADO = ['productor', 'ingeniero_agronomo', 'asesor_tecnico', 'contratista', 'otro'];

    private function entero(Request $request, string $header): ?int
    {
        $v = (string) $request->header($header, '');

        return ctype_digit($v) && (int) $v > 0 ? (int) $v : null;
    }

    public function handle(Request $request, Closure $next): Response
    {
        $usuario = $this->entero($request, 'X-Usuario-Id');
        $cuenta = $this->entero($request, 'X-Cuenta-Id');

        if ($usuario === null || $cuenta === null) {
            Log::warning('Pedido sin identidad válida (usuario/cuenta)', ['ruta' => $request->path()]);

            return Respuesta::error('no_autenticado', 'Falta la identidad del usuario', 401);
        }

        $rol = (string) $request->header('X-Usuario-Rol', '');
        $esAdmin = $rol === 'admin';

        if (! $esAdmin && ! in_array($rol, self::ROLES_EMPLEADO, true)) {
            Log::warning('Rol inválido en la identidad', ['usuario_id' => $usuario, 'rol' => $rol]);

            return Respuesta::error('rol_invalido', 'Rol no permitido', 403);
        }

        $estancia = $esAdmin ? null : $this->entero($request, 'X-Establecimiento-Id');

        if (! $esAdmin && $estancia === null) {
            Log::warning('Empleado sin estancia asignada', ['usuario_id' => $usuario]);

            return Respuesta::error('sin_estancia', 'El empleado no tiene una estancia asignada', 403);
        }

        $request->attributes->set('usuario_id', $usuario);
        $request->attributes->set('cuenta_id', $cuenta);
        $request->attributes->set('rol', $rol);
        $request->attributes->set('es_admin', $esAdmin);
        $request->attributes->set('establecimiento_id', $estancia);

        return $next($request);
    }
}
