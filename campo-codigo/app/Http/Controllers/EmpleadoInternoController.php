<?php

namespace App\Http\Controllers;

use App\Models\Asignacion;
use App\Models\CodigoEstancia;
use App\Models\Cuenta;
use App\Models\Empleado;
use App\Models\Establecimiento;
use App\Support\Respuesta;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

/** API interna del registro de empleados (llamada por Auth, protegida por el secreto del gateway). */
class EmpleadoInternoController extends Controller
{
    /**
     * POST /interno/empleados/registrar. En una sola transacción: valida el código, aplica el límite del plan,
     * crea empleado + asignación y consume el código. La cuenta y la estancia salen del código, nunca del pedido.
     */
    public function registrar(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'codigo' => 'required|string|max:64',
            'usuario_id' => 'required|integer|min:1',
            'rol' => ['required', 'string', Rule::in(Empleado::ROLES)],
        ]);

        return DB::transaction(function () use ($datos) {
            $codigo = CodigoEstancia::where('codigo', CodigoEstancia::normalizar($datos['codigo']))->lockForUpdate()->first();
            $invalido = Respuesta::error('codigo_invalido', 'Código inexistente, usado o revocado', 422);

            if (! $codigo || $codigo->estado !== 'activo') {
                return $invalido;
            }

            $cuenta = Cuenta::lockForUpdate()->find($codigo->cuenta_id);
            $est = Establecimiento::where('id', $codigo->establecimiento_id)->where('cuenta_id', $codigo->cuenta_id)->first();

            if (! $cuenta || ! $est) { // estancia dada de baja
                return $invalido;
            }

            if (Cuenta::where('administrador_usuario_id', $datos['usuario_id'])->exists()
                || Empleado::where('usuario_id', $datos['usuario_id'])->exists()) {
                return Respuesta::error('conflicto', 'El usuario ya pertenece a una cuenta', 409);
            }

            if ($cuenta->limiteAlcanzado('empleados')) {
                return Respuesta::error('limite_plan', 'La cuenta alcanzó el límite de empleados de su plan', 403);
            }

            $empleado = Empleado::create(['cuenta_id' => $cuenta->id, 'usuario_id' => $datos['usuario_id'], 'rol' => $datos['rol'], 'estado' => 'activo']);
            Asignacion::create(['empleado_id' => $empleado->id, 'establecimiento_id' => $est->id, 'estado' => 'activa']);
            $codigo->update(['estado' => 'usado', 'empleado_id' => $empleado->id, 'usado_en' => now()]);

            Log::info('Empleado registrado', ['empleado_id' => $empleado->id, 'cuenta_id' => $cuenta->id, 'establecimiento_id' => $est->id]);

            return response()->json([
                'empleado_id' => $empleado->id,
                'establecimiento_id' => $est->id,
                'establecimiento_nombre' => $est->nombre,
            ], 201);
        });
    }

    /**
     * DELETE /interno/empleados/usuario/{id}/registro: compensación de un registro que Auth no pudo completar.
     * Idempotente: borra empleado y asignación, y deja el código otra vez activo.
     */
    public function compensar(int $id): JsonResponse
    {
        $empleado = Empleado::where('usuario_id', $id)->first();

        if (! $empleado) {
            return response()->json(['mensaje' => 'Sin registro que compensar']);
        }

        DB::transaction(function () use ($empleado) {
            CodigoEstancia::where('empleado_id', $empleado->id)->update(['estado' => 'activo', 'empleado_id' => null, 'usado_en' => null]);
            $empleado->asignaciones()->delete();
            $empleado->delete();
        });

        Log::warning('Registro de empleado compensado', ['usuario_id' => $id]);

        return response()->json(['mensaje' => 'Registro deshecho']);
    }
}
