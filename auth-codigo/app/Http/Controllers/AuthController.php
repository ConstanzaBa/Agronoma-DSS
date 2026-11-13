<?php

namespace App\Http\Controllers;

use App\Models\TokenAcceso;
use App\Models\Usuario;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    private const HORAS_VIGENCIA = 24;

    public function registro(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'nombre' => 'required|string|max:80',
            'apellido' => 'required|string|max:80',
            'correo' => 'required|email|max:150|unique:usuarios,correo',
            'contrasena' => 'required|string|min:8|max:100',
            'profesion' => 'nullable|string|max:40',
            'telefono' => 'nullable|string|max:30',
        ]);

        $usuario = Usuario::create($datos + ['rol' => 'productor', 'activo' => true]);

        return response()->json($usuario, 201);
    }

    public function login(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'correo' => 'required|email',
            'contrasena' => 'required|string',
        ]);

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
            'usuario' => $usuario,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->attributes->get('token_acceso')->delete();

        return response()->json(['mensaje' => 'Sesión cerrada']);
    }

    public function me(Request $request): JsonResponse
    {
        $token = $request->attributes->get('token_acceso');

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
    }
}
