<?php

namespace App\Http\Controllers;

use App\Models\CorreoSimulado;
use App\Models\Usuario;
use Illuminate\Http\JsonResponse;

/**
 * Bandeja simulada para la demo. Deshabilitada salvo DEMO_CORREO_SIMULADO=true.
 * Se lee con un token aleatorio que solo recibe quien contrató, vale 30 minutos y deja de servir
 * apenas el administrador completa su primer ingreso (la contraseña temporal ya no existe).
 */
class CorreoSimuladoController extends Controller
{
    private const MINUTOS_VIGENCIA = 30;

    public function show(string $token): JsonResponse
    {
        $noEncontrado = response()->json(['codigo' => 'no_encontrado', 'mensaje' => 'Recurso inexistente'], 404);

        if (! config('agrotech.demo_correo')) {
            return $noEncontrado;
        }

        $correo = CorreoSimulado::where('token_lectura', hash('sha256', $token))->first();

        if (! $correo || $correo->enviado_en->lt(now()->subMinutes(self::MINUTOS_VIGENCIA))) {
            return $noEncontrado;
        }

        $pendiente = Usuario::where('correo', $correo->destinatario)->where('primer_ingreso_pendiente', true)->exists();

        if (! $pendiente) {
            return $noEncontrado;
        }

        return response()->json($correo->only(['destinatario', 'asunto', 'cuerpo', 'enviado_en']));
    }
}
