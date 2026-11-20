<?php

namespace App\Http\Controllers;

use App\Models\CorreoSimulado;
use App\Models\Usuario;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

/**
 * Contratación simulada. Auth orquesta: crea el único admin y le pide a Campo la cuenta con su plan.
 *
 * Coordinación sin FK entre servicios: el usuario se inserta dentro de una transacción local que
 * solo se confirma si Campo confirmó la cuenta. Si Campo falla → rollback (no queda admin sin cuenta).
 * Si el resultado en Campo es incierto o falla el commit → se compensa borrando la cuenta en Campo
 * (idempotente), de modo que tampoco queda una cuenta sin administrador.
 */
class ContratacionController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'nombre' => 'required|string|max:80',
            'apellido' => 'required|string|max:80',
            'correo' => 'required|email|max:150|unique:usuarios,correo',
            'telefono' => 'nullable|string|max:30',
            'plan' => 'required|string|max:20',
        ]);

        // Contraseña temporal propia de esta contratación. Solo existe en memoria hasta el correo simulado.
        $temporal = Str::password(16, symbols: false);
        $cuentaCampo = null;
        $usuarioId = null;
        $fase = 'usuario';

        try {
            DB::beginTransaction();

            $usuario = new Usuario([
                'nombre' => $datos['nombre'],
                'apellido' => $datos['apellido'],
                'correo' => $datos['correo'],
                'telefono' => $datos['telefono'] ?? null,
                'contrasena' => $temporal, // el cast "hashed" la guarda con hash
                'rol' => 'admin',
                'activo' => true,
            ]);
            $usuario->primer_ingreso_pendiente = true; // no es asignable en masa
            $usuario->save();
            $usuarioId = $usuario->id;

            $fase = 'campo';
            $respuesta = Http::withHeaders([
                'X-Gateway-Secret' => config('agrotech.gateway_secret'),
                'Accept' => 'application/json',
            ])->timeout(5)->post(
                rtrim((string) config('agrotech.campo_url'), '/') . '/api/v1/interno/cuentas',
                ['administrador_usuario_id' => $usuarioId, 'plan' => $datos['plan']]
            );

            if ($respuesta->status() === 422) {
                DB::rollBack();

                return response()->json([
                    'codigo' => 'validacion',
                    'mensaje' => 'Datos inválidos',
                    'detalles' => $respuesta->json('detalles') ?? ['plan' => ['Plan inválido']],
                ], 422);
            }

            if (! $respuesta->successful()) {
                throw new \RuntimeException('campo respondió ' . $respuesta->status());
            }

            $cuentaCampo = $respuesta->json();

            // Referencia lógica a la cuenta de Campo (no asignable en masa). Si falta, se compensa como cualquier otro fallo.
            if (! is_int($cuentaCampo['id'] ?? null)) {
                throw new \RuntimeException('campo no devolvió el id de la cuenta');
            }
            $usuario->cuenta_id = $cuentaCampo['id'];
            $usuario->save();
            $fase = 'correo';

            $lectura = config('agrotech.demo_correo') ? Str::random(40) : null;

            CorreoSimulado::create([
                'token_lectura' => $lectura ? hash('sha256', $lectura) : null,
                'destinatario' => $usuario->correo,
                'asunto' => 'Bienvenido a Agrónoma: tus credenciales de administrador',
                'cuerpo' => "Hola {$usuario->nombre},\n\nTu cuenta (plan {$cuentaCampo['plan']}) fue creada.\n"
                    . "Usuario: {$usuario->correo}\nContraseña temporal: {$temporal}\n",
                'enviado_en' => now(),
            ]);

            DB::commit();
        } catch (UniqueConstraintViolationException $e) {
            $this->deshacer(null);

            return response()->json([
                'codigo' => 'validacion',
                'mensaje' => 'Datos inválidos',
                'detalles' => ['correo' => ['El correo ya está registrado']],
            ], 422);
        } catch (Throwable $e) {
            // Tras llamar a Campo el resultado puede ser incierto (timeout): se compensa siempre.
            $this->deshacer($fase === 'usuario' ? null : $usuarioId);

            Log::error('Contratación fallida', [
                'fase' => $fase,
                'tipo' => $e instanceof ConnectionException ? 'conexion' : get_class($e),
                'usuario_id' => $usuarioId,
            ]);

            return response()->json([
                'codigo' => 'servicio_no_disponible',
                'mensaje' => 'No se pudo completar la contratación. No se creó nada; reintentá.',
            ], 503);
        }

        Log::info('Contratación completada', ['usuario_id' => $usuarioId, 'cuenta_id' => $cuentaCampo['id'], 'plan' => $cuentaCampo['plan']]);

        return response()->json([
            'cuenta' => ['id' => $cuentaCampo['id'], 'plan' => $cuentaCampo['plan']],
            'administrador' => $usuario->only(['id', 'nombre', 'apellido', 'correo', 'rol']),
            'mensaje' => 'Contratación realizada. Las credenciales fueron enviadas por correo (simulado).',
        ] + ($lectura ? ['correo_simulado' => ['token' => $lectura]] : []), 201);
    }

    /** Revierte lo local y, si Campo pudo haber creado la cuenta, la compensa (mejor esfuerzo, idempotente). */
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
                ->delete(rtrim((string) config('agrotech.campo_url'), '/') . '/api/v1/interno/cuentas/administrador/' . $usuarioId);
        } catch (Throwable $e) {
            Log::critical('No se pudo compensar la cuenta en Campo; revisar a mano', ['administrador_usuario_id' => $usuarioId]);
        }
    }
}
