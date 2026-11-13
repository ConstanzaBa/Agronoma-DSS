<?php

namespace App\Http\Controllers;

use App\Models\TokenAcceso;
use App\Models\Usuario;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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

        if ($registro->tipo_autenticable === 'usuario') {
            $usuario = Usuario::find($registro->autenticable_id);

            if (! $usuario || ! $usuario->activo) {
                return $invalido;
            }

            $rol = $usuario->rol;
        }

        $registro->forceFill(['ultimo_uso_en' => now()])->save();

        return response()->json([
            'usuario_id' => $registro->tipo_autenticable === 'usuario' ? $registro->autenticable_id : null,
            'autenticable' => $registro->tipo_autenticable,
            'autenticable_id' => $registro->autenticable_id,
            'rol' => $rol,
            'permisos' => $registro->permisos,
        ]);
    }

    public function dispositivo(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'dispositivo_id' => 'required|integer|min:1',
            'nombre' => 'required|string|max:255',
        ]);

        $plano = Str::random(40);
        $permisos = ['lecturas:crear'];

        TokenAcceso::create([
            'tipo_autenticable' => 'dispositivo',
            'autenticable_id' => $datos['dispositivo_id'],
            'nombre' => $datos['nombre'],
            'token' => hash('sha256', $plano),
            'permisos' => $permisos,
            'expira_en' => null,
        ]);

        return response()->json([
            'token' => $plano,
            'permisos' => $permisos,
            'aviso' => 'Guardalo ahora: no se vuelve a mostrar',
        ], 201);
    }
}
