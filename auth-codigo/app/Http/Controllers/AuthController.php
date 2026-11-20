<?php

namespace App\Http\Controllers;

use App\Models\TokenAcceso;
use App\Models\Usuario;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Throwable;

class AuthController extends Controller
{
    private const HORAS_VIGENCIA = 24;

    private const ROLES_EMPLEADO = ['productor', 'ingeniero_agronomo', 'asesor_tecnico', 'contratista', 'otro'];

    /**
     * Registro exclusivo de empleados, con código de estancia. Nunca crea administradores.
     * El usuario se inserta en una transacción local que solo se confirma si Campo confirmó empleado + asignación
     * (y consumió el código). Si Campo falla → rollback; si el resultado es incierto → compensación en Campo.
     */
    public function registro(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'nombre' => 'required|string|max:80',
            'apellido' => 'required|string|max:80',
            'correo' => 'required|email|max:150|unique:usuarios,correo',
            'contrasena' => 'required|string|min:8|max:100',
            'profesion' => 'nullable|string|max:40',
            'telefono' => 'nullable|string|max:30',
            'rol' => ['required', 'string', Rule::in(self::ROLES_EMPLEADO)], // admin queda rechazado aquí
            'codigo_estancia' => 'required|string|max:64',
        ]);

        $usuarioId = null;
        $fase = 'usuario';

        try {
            DB::beginTransaction();

            $usuario = Usuario::create([
                'nombre' => $datos['nombre'],
                'apellido' => $datos['apellido'],
                'correo' => $datos['correo'],
                'contrasena' => $datos['contrasena'],
                'profesion' => $datos['profesion'] ?? null,
                'telefono' => $datos['telefono'] ?? null,
                'rol' => $datos['rol'],
                'activo' => true,
            ]);
            $usuarioId = $usuario->id;

            // Solo viajan el código, el id del usuario recién creado y el rol ya validado.
            $fase = 'campo';
            $r = Http::withHeaders(['X-Gateway-Secret' => config('agrotech.gateway_secret'), 'Accept' => 'application/json'])
                ->timeout(5)
                ->post(rtrim((string) config('agrotech.campo_url'), '/') . '/api/v1/interno/empleados/registrar', [
                    'codigo' => $datos['codigo_estancia'],
                    'usuario_id' => $usuarioId,
                    'rol' => $datos['rol'],
                ]);

            if (in_array($r->status(), [403, 409, 422], true)) {
                DB::rollBack(); // Campo respondió que no registró nada: no hay nada que compensar.
                $codigo = $r->json('codigo');

                if ($codigo === 'limite_plan') {
                    return response()->json(['codigo' => 'limite_plan', 'mensaje' => 'La cuenta alcanzó el límite de empleados de su plan'], 403);
                }

                if ($r->status() === 409) {
                    return response()->json(['codigo' => 'conflicto', 'mensaje' => 'No se pudo registrar al usuario'], 409);
                }

                return response()->json([
                    'codigo' => 'validacion',
                    'mensaje' => 'Datos inválidos',
                    'detalles' => ['codigo_estancia' => ['Código inexistente, usado o revocado']],
                ], 422);
            }

            if (! $r->successful() || ! is_int($r->json('establecimiento_id'))) {
                throw new \RuntimeException('campo respondió ' . $r->status());
            }

            $estancia = ['id' => $r->json('establecimiento_id'), 'nombre' => $r->json('establecimiento_nombre')];
            $fase = 'commit';
            DB::commit();
        } catch (UniqueConstraintViolationException $e) {
            $this->deshacer($fase === 'campo' ? $usuarioId : null);

            return response()->json([
                'codigo' => 'validacion',
                'mensaje' => 'Datos inválidos',
                'detalles' => ['correo' => ['El correo ya está registrado']],
            ], 422);
        } catch (Throwable $e) {
            $this->deshacer($fase === 'usuario' ? null : $usuarioId);

            Log::error('Registro de empleado fallido', ['fase' => $fase, 'tipo' => get_class($e), 'usuario_id' => $usuarioId]);

            return response()->json([
                'codigo' => 'servicio_no_disponible',
                'mensaje' => 'No se pudo completar el registro. No se creó nada; reintentá.',
            ], 503);
        }

        Log::info('Empleado registrado', ['usuario_id' => $usuarioId]);

        return response()->json(
            $usuario->only(['id', 'nombre', 'apellido', 'correo', 'rol', 'profesion', 'telefono', 'activo']) + ['estancia' => $estancia],
            201
        );
    }

    /** Revierte lo local y, si Campo pudo haber registrado al empleado, lo compensa (mejor esfuerzo, idempotente). */
    private function deshacer(?int $usuarioId): void
    {
        try {
            DB::rollBack();
        } catch (Throwable $e) {
            // sin transacción activa
        }

        if ($usuarioId === null) {
            return;
        }

        try {
            Http::withHeaders(['X-Gateway-Secret' => config('agrotech.gateway_secret'), 'Accept' => 'application/json'])
                ->timeout(5)
                ->delete(rtrim((string) config('agrotech.campo_url'), '/') . "/api/v1/interno/empleados/usuario/$usuarioId/registro");
        } catch (Throwable $e) {
            Log::critical('No se pudo compensar el registro en Campo; revisar a mano', ['usuario_id' => $usuarioId]);
        }
    }

    public function login(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'correo' => 'required|email',
            'contrasena' => 'required|string',
        ]);

        try {
            $usuario = Usuario::where('correo', $datos['correo'])->first();

            if (! $usuario || ! Hash::check($datos['contrasena'], $usuario->contrasena)) {
                return response()->json([
                    'codigo' => 'credenciales_invalidas',
                    'mensaje' => 'Correo o contraseña incorrectos',
                ], 401);
            }

            if (! $usuario->activo) {
                return response()->json([
                    'codigo' => 'usuario_inactivo',
                    'mensaje' => 'El usuario está desactivado',
                ], 403);
            }

            $plano = Str::random(40);
            $expira = now()->addHours(self::HORAS_VIGENCIA);

            TokenAcceso::create([
                'tipo_autenticable' => 'usuario',
                'autenticable_id' => $usuario->id,
                'nombre' => 'sesion',
                'token' => hash('sha256', $plano),
                'permisos' => ['*'],
                'expira_en' => $expira,
            ]);

            return response()->json([
                'token' => $plano,
                'tipo' => 'Bearer',
                'expira_en' => $expira->toIso8601String(),
                'primer_ingreso_pendiente' => (bool) $usuario->primer_ingreso_pendiente,
                'usuario' => $usuario,
            ]);
        } catch (Throwable $e) {
            Log::error('Error inesperado en inicio de sesión', [
                'tipo' => get_class($e),
                'mensaje' => $e->getMessage(),
                'correo' => $datos['correo'],
            ]);

            return response()->json([
                'codigo' => 'error_interno',
                'mensaje' => 'No se pudo iniciar sesión',
            ], 500);
        }
    }

    public function logout(Request $request): JsonResponse
    {
        try {
            $token = $request->attributes->get('token_acceso');

            if (! $token) {
                return response()->json([
                    'codigo' => 'no_autenticado',
                    'mensaje' => 'No hay una sesión válida',
                ], 401);
            }

            $token->delete();

            return response()->json([
                'mensaje' => 'Sesión cerrada',
            ]);
        } catch (Throwable $e) {
            Log::error('Error inesperado al cerrar sesión', [
                'tipo' => get_class($e),
                'mensaje' => $e->getMessage(),
            ]);

            return response()->json([
                'codigo' => 'error_interno',
                'mensaje' => 'No se pudo cerrar la sesión',
            ], 500);
        }
    }

    public function me(Request $request): JsonResponse
    {
        try {
            $token = $request->attributes->get('token_acceso');

            if (! $token) {
                return response()->json([
                    'codigo' => 'no_autenticado',
                    'mensaje' => 'No hay una sesión válida',
                ], 401);
            }

            if ($token->tipo_autenticable !== 'usuario') {
                return response()->json([
                    'codigo' => 'sin_permiso',
                    'mensaje' => 'Este token no pertenece a una persona',
                ], 403);
            }

            $usuario = Usuario::find($token->autenticable_id);

            if (! $usuario || ! $usuario->activo) {
                return response()->json([
                    'codigo' => 'no_autenticado',
                    'mensaje' => 'Usuario inexistente o desactivado',
                ], 401);
            }

            return response()->json($usuario);
        } catch (Throwable $e) {
            Log::error('Error inesperado al consultar usuario autenticado', [
                'tipo' => get_class($e),
                'mensaje' => $e->getMessage(),
            ]);

            return response()->json([
                'codigo' => 'error_interno',
                'mensaje' => 'No se pudo consultar el usuario',
            ], 500);
        }
    }
}
