<?php

namespace App\Http\Controllers;

use App\Models\Empleado;
use App\Support\Respuesta;
use App\Support\ResolutorContexto;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

/** API interna para el Gateway (protegida por el secreto del gateway; no la usa el navegador). */
class ContextoInternoController extends Controller
{
    /**
     * GET /interno/usuarios/{id}/contexto
     * Devuelve lo necesario para X-Cuenta-Id, X-Usuario-Rol y (solo empleados) X-Establecimiento-Id.
     * Todo sale de la base de Campo; el pedido solo aporta el usuario_id que el Gateway ya autenticó en Auth.
     */
    public function mostrar(int $id, ResolutorContexto $resolutor): JsonResponse
    {
        $contexto = $resolutor->resolver($id);

        if (! $contexto) {
            return Respuesta::error('sin_cuenta', 'El usuario no pertenece a ninguna cuenta', 404);
        }

        $rol = 'admin';

        if (! $contexto->esAdmin) {
            $rol = Empleado::where('usuario_id', $id)->where('estado', 'activo')->value('rol');

            if (! in_array($rol, Empleado::ROLES, true)) {
                Log::error('Empleado con rol fuera del catálogo', ['usuario_id' => $id, 'rol' => $rol]);

                return Respuesta::error('sin_cuenta', 'El usuario no tiene un rol válido', 404);
            }
        }

        return response()->json([
            'usuario_id' => $contexto->usuarioId,
            'cuenta_id' => $contexto->cuentaId,
            'rol' => $rol,
            'establecimiento_id' => $contexto->esAdmin ? null : $contexto->establecimientoId,
        ]);
    }
}
