<?php

namespace App\Http\Controllers;

use App\Models\Cuenta;
use App\Support\ContextoCuenta;
use App\Support\Respuesta;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

abstract class Controller
{
    protected function contexto(Request $request): ContextoCuenta
    {
        return $request->attributes->get('contexto');
    }

    /** null si hay cupo; si no, la respuesta de error por límite del plan. */
    protected function limiteExcedido(Request $request, string $recurso): ?JsonResponse
    {
        $cuenta = Cuenta::findOrFail($this->contexto($request)->cuentaId);

        return $cuenta->limiteAlcanzado($recurso)
            ? Respuesta::error('limite_plan', "El plan {$cuenta->plan} no admite más $recurso", 403)
            : null;
    }
}
