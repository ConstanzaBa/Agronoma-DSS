<?php

namespace App\Support;

/** Quién es el usuario autenticado dentro de Campo: admin de una cuenta o empleado de una estancia. */
class ContextoCuenta
{
    public function __construct(
        public readonly int $usuarioId,
        public readonly int $cuentaId,
        public readonly bool $esAdmin,
        /** Estancia asignada (solo empleados; null para el admin). */
        public readonly ?int $establecimientoId = null,
    ) {}
}
