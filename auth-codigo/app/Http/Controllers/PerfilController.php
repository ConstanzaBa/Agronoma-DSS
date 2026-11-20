<?php

namespace App\Http\Controllers;

use App\Models\TokenAcceso;
use App\Models\Usuario;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

class PerfilController extends Controller
{
    /** GET /perfil */
    public function show(Request $request): JsonResponse
    {
        $usuario = $this->usuario($request);

        return $usuario instanceof JsonResponse ? $usuario : response()->json($this->datos($usuario));
    }

    /**
     * PUT /perfil: solo datos personales. Cualquier otro campo enviado (id, rol, correo, contraseña,
     * estado de primer ingreso...) se ignora: solo se guardan las claves validadas de abajo.
     */
    public function actualizar(Request $request): JsonResponse
    {
        $usuario = $this->usuario($request);

        if ($usuario instanceof JsonResponse) {
            return $usuario;
        }

        if ($usuario->primer_ingreso_pendiente) {
            return $this->pendiente();
        }

        $datos = $request->validate([
            'nombre' => 'sometimes|required|string|max:80',
            'apellido' => 'sometimes|required|string|max:80',
            'telefono' => 'sometimes|nullable|string|max:30',
            'profesion' => 'sometimes|nullable|string|max:40',
        ]);

        $usuario->update($datos);

        return response()->json($this->datos($usuario->fresh()));
    }

    /** POST /primer-ingreso: datos personales + contraseña propia. Solo una vez, y solo si está pendiente. */
    public function primerIngreso(Request $request): JsonResponse
    {
        $usuario = $this->usuario($request);

        if ($usuario instanceof JsonResponse) {
            return $usuario;
        }

        if (! $usuario->primer_ingreso_pendiente) {
            return response()->json([
                'codigo' => 'primer_ingreso_no_pendiente',
                'mensaje' => 'No hay un primer ingreso pendiente',
            ], 409);
        }

        $datos = $request->validate([
            'nombre' => 'required|string|max:80',
            'apellido' => 'required|string|max:80',
            'telefono' => 'nullable|string|max:30',
            'profesion' => 'nullable|string|max:40',
            'contrasena' => 'required|string|min:8|max:100',
        ]);

        if (Hash::check($datos['contrasena'], $usuario->contrasena)) {
            return response()->json([
                'codigo' => 'validacion',
                'mensaje' => 'Datos inválidos',
                'detalles' => ['contrasena' => ['La nueva contraseña debe ser distinta de la temporal']],
            ], 422);
        }

        $actual = $request->attributes->get('token_acceso');

        // Todo o nada: datos, hash y fin del primer ingreso se guardan juntos.
        DB::transaction(function () use ($usuario, $datos, $actual) {
            $usuario->forceFill($datos + ['primer_ingreso_pendiente' => false])->save(); // el cast "hashed" guarda solo el hash

            // Las demás sesiones abiertas con la contraseña temporal dejan de servir.
            TokenAcceso::where('tipo_autenticable', 'usuario')
                ->where('autenticable_id', $usuario->id)
                ->where('id', '!=', $actual->id)
                ->delete();
        });

        Log::info('Primer ingreso completado', ['usuario_id' => $usuario->id]);

        return response()->json($this->datos($usuario->fresh()));
    }

    /** Usuario del token, o la respuesta de error correspondiente. */
    private function usuario(Request $request): Usuario|JsonResponse
    {
        $token = $request->attributes->get('token_acceso');

        if (! $token || $token->tipo_autenticable !== 'usuario') {
            return response()->json(['codigo' => 'sin_permiso', 'mensaje' => 'Este token no pertenece a una persona'], 403);
        }

        $usuario = Usuario::find($token->autenticable_id);

        if (! $usuario || ! $usuario->activo) {
            return response()->json(['codigo' => 'no_autenticado', 'mensaje' => 'Usuario inexistente o desactivado'], 401);
        }

        return $usuario;
    }

    private function pendiente(): JsonResponse
    {
        return response()->json([
            'codigo' => 'primer_ingreso_pendiente',
            'mensaje' => 'Primero completá tu primer ingreso',
        ], 403);
    }

    private function datos(Usuario $u): array
    {
        return $u->only(['id', 'nombre', 'apellido', 'correo', 'rol', 'profesion', 'telefono', 'activo', 'primer_ingreso_pendiente']);
    }
}
