<?php

namespace App\Support;

use App\Models\Asignacion;
use App\Models\Cuenta;
use App\Models\Empleado;

/**
 * Única fuente de verdad del contexto de un usuario según la base de Campo:
 * administrador de una cuenta, o empleado activo con una estancia asignada vigente de su misma cuenta.
 * La usan ResolverContexto (permisos dentro de Campo) y el endpoint interno que consume el Gateway.
 */
class ResolutorContexto
{
    public function resolver(int $usuarioId): ?ContextoCuenta
    {
        $cuenta = Cuenta::where('administrador_usuario_id', $usuarioId)->first();

        return $cuenta
            ? new ContextoCuenta($usuarioId, $cuenta->id, true)
            : $this->comoEmpleado($usuarioId);
    }

    private function comoEmpleado(int $uid): ?ContextoCuenta
    {
        $empleado = Empleado::where('usuario_id', $uid)->where('estado', 'activo')->first();

        if (! $empleado) {
            return null;
        }

        // La estancia asignada debe existir (no dada de baja) y pertenecer a la misma cuenta.
        $asignacion = Asignacion::where('empleado_id', $empleado->id)
            ->where('estado', 'activa')
            ->whereHas('establecimiento', fn($e) => $e->where('cuenta_id', $empleado->cuenta_id))
            ->latest('id')
            ->first();

        return $asignacion
            ? new ContextoCuenta($uid, $empleado->cuenta_id, false, $asignacion->establecimiento_id)
            : null;
    }
}
