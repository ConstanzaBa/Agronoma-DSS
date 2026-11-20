<?php

namespace App\Http\Controllers;

use App\Models\Cuenta;
use App\Support\Respuesta;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

/** API interna para la contratación (llamada por Auth, protegida por el secreto del gateway). */
class CuentaInternaController extends Controller
{
    /** POST /interno/cuentas: crea la cuenta del administrador recién creado en Auth. */
    public function store(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'administrador_usuario_id' => 'required|integer|min:1',
            'plan' => ['required', 'string', Rule::in(array_keys(config('planes')))],
        ]);

        try {
            $cuenta = Cuenta::create($datos + ['estado' => 'activa']);
        } catch (UniqueConstraintViolationException $e) {
            return Respuesta::error('conflicto', 'Ese usuario ya administra una cuenta', 409);
        }

        Log::info('Cuenta creada por contratación', ['cuenta_id' => $cuenta->id, 'plan' => $cuenta->plan]);

        return response()->json([
            'id' => $cuenta->id,
            'plan' => $cuenta->plan,
            'administrador_usuario_id' => $cuenta->administrador_usuario_id,
        ], 201);
    }

    /**
     * DELETE /interno/cuentas/administrador/{id}: compensación de una contratación fallida.
     * Idempotente, y solo borra cuentas sin estancias (una cuenta recién creada nunca las tiene).
     */
    public function compensar(int $id): JsonResponse
    {
        $cuenta = Cuenta::where('administrador_usuario_id', $id)->first();

        if (! $cuenta) {
            return response()->json(['mensaje' => 'Sin cuenta que compensar']);
        }

        if ($cuenta->establecimientos()->withTrashed()->exists()) {
            return Respuesta::error('conflicto', 'La cuenta ya tiene datos; no se elimina', 409);
        }

        $cuenta->delete();
        Log::warning('Cuenta eliminada por contratación fallida', ['cuenta_id' => $cuenta->id]);

        return response()->json(['mensaje' => 'Cuenta eliminada']);
    }
}
