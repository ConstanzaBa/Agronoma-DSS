<?php

namespace App\Http\Controllers;

use App\Models\TokenAcceso;
use App\Models\Usuario;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class InternoController extends Controller
{
    public function validar(Request $request): JsonResponse
    {
        $datos = $request->validate(['token' => 'required|string']);

        $registro = TokenAcceso::where('token', hash('sha256', $datos['token']))->first();

        $invalido = response()->json([
            'codigo' => 'token_invalido',
            'mensaje' => 'Token inválido o vencido',
        ], 401);

        if (! $registro || ($registro->expira_en && $registro->expira_en->isPast())) {
            return $invalido;
        }

        $rol = null;
        $primerIngresoPendiente = false;

        if ($registro->tipo_autenticable === 'usuario') {
            $usuario = Usuario::find($registro->autenticable_id);

            if (! $usuario || ! $usuario->activo) {
                return $invalido;
            }

            $rol = $usuario->rol;
            $primerIngresoPendiente = (bool) $usuario->primer_ingreso_pendiente;
        }

        $registro->forceFill(['ultimo_uso_en' => now()])->save();

        return response()->json([
            'usuario_id' => $registro->tipo_autenticable === 'usuario' ? $registro->autenticable_id : null,
            'autenticable' => $registro->tipo_autenticable,
            'autenticable_id' => $registro->autenticable_id,
            'rol' => $rol,
            'primer_ingreso_pendiente' => $primerIngresoPendiente,
            'permisos' => $registro->permisos,
        ]);
    }

    /** GET /interno/usuarios/{id}: datos públicos del usuario para otros servicios. Nunca devuelve la contraseña. */
    public function usuario(int $id): JsonResponse
    {
        $usuario = Usuario::find($id);

        if (! $usuario) {
            return response()->json(['codigo' => 'no_encontrado', 'mensaje' => 'Usuario inexistente'], 404);
        }

        return response()->json($usuario->only(['id', 'nombre', 'apellido', 'correo', 'rol', 'profesion', 'telefono', 'activo']));
    }

    /**
     * GET /interno/cuentas/{cuenta_id}/administrador: el único administrador de una cuenta, con lo mínimo
     * para notificarlo. Nunca devuelve la contraseña ni datos personales adicionales.
     */
    public function administradorDeCuenta(int $cuentaId): JsonResponse
    {
        $admin = Usuario::where('cuenta_id', $cuentaId)->where('rol', 'admin')->first();

        if (! $admin) {
            return response()->json(['codigo' => 'no_encontrado', 'mensaje' => 'Cuenta o administrador inexistente'], 404);
        }

        return response()->json([
            'cuenta_id' => $cuentaId,
            'usuario_id' => $admin->id,
            'nombre' => $admin->nombre,
            'correo' => $admin->correo,
            'activo' => (bool) $admin->activo,
        ]);
    }

    /** POST /interno/usuarios/{id}/desactivar: baja lógica de un empleado. Nunca desactiva administradores. */
    public function desactivar(int $id): JsonResponse
    {
        $usuario = Usuario::find($id);

        if (! $usuario) {
            return response()->json(['codigo' => 'no_encontrado', 'mensaje' => 'Usuario inexistente'], 404);
        }

        if ($usuario->rol === 'admin') {
            return response()->json(['codigo' => 'conflicto', 'mensaje' => 'No se puede desactivar a un administrador'], 409);
        }

        DB::transaction(function () use ($usuario) {
            $usuario->update(['activo' => false]);
            TokenAcceso::where('tipo_autenticable', 'usuario')->where('autenticable_id', $usuario->id)->delete();
        });

        return response()->json(['mensaje' => 'Usuario desactivado']);
    }

    public function dispositivo(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'dispositivo_id' => 'required|integer|min:1',
            'nombre' => 'required|string|max:255',
        ]);

        $plano = Str::random(40);
        $permisos = ['lecturas:crear'];

        // Emitir un token nuevo invalida los anteriores del mismo dispositivo. Si la creación falla,
        // el rollback conserva el token anterior: el dispositivo nunca queda sin token ni con dos.
        DB::transaction(function () use ($datos, $plano, $permisos) {
            TokenAcceso::where('tipo_autenticable', 'dispositivo')
                ->where('autenticable_id', $datos['dispositivo_id'])
                ->delete();

            TokenAcceso::create([
                'tipo_autenticable' => 'dispositivo',
                'autenticable_id' => $datos['dispositivo_id'],
                'nombre' => $datos['nombre'],
                'token' => hash('sha256', $plano),
                'permisos' => $permisos,
                'expira_en' => null,
            ]);
        });

        return response()->json([
            'token' => $plano,
            'permisos' => $permisos,
            'aviso' => 'Guardalo ahora: no se vuelve a mostrar',
        ], 201);
    }
}
