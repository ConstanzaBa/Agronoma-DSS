<?php

namespace App\Http\Controllers;

use App\Models\Dispositivo;
use App\Servicios\RecepcionLecturas;
use App\Support\Respuesta;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SimuladorController extends Controller
{
    public function sensor(Request $request, RecepcionLecturas $recepcion): JsonResponse
    {
        $datos = $request->validate([
            'dispositivo_id' => 'required|integer|min:1',
            'modo' => 'required|in:normal,repetida,desordenada',
            'cantidad' => 'nullable|integer|between:1,20',
        ]);

        $d = Dispositivo::with('lote.establecimiento')->find($datos['dispositivo_id']);

        if (! $d) {
            return Respuesta::error('no_encontrado', 'Dispositivo inexistente', 404);
        }

        if (! $d->activo) {
            Log::warning('Simulación rechazada: dispositivo inactivo', ['dispositivo_id' => $d->id]);

            return Respuesta::error('sin_permiso', 'Dispositivo inexistente o inactivo', 403);
        }

        $base = (int) $d->ultima_secuencia;
        $n = (int) ($datos['cantidad'] ?? 3);
        $crear = fn(int $s) => [
            'secuencia' => $s,
            'humedad_suelo_pct' => mt_rand(80, 400) / 10,
            'humedad_aire_pct' => mt_rand(300, 900) / 10,
            'temperatura_c' => mt_rand(100, 350) / 10,
            'precipitacion_mm' => 0,
            'medido_en' => now()->toIso8601String(),
        ];

        $envios = match ($datos['modo']) {
            'normal' => array_map($crear, range($base + 1, $base + $n)),
            'repetida' => [$p = $crear($base + 1), $p],
            'desordenada' => [$crear($base + 3), $crear($base + 1), $crear($base + 2)],
        };

        Log::info('Simulación de sensor', ['dispositivo_id' => $d->id, 'modo' => $datos['modo']]);

        $resultados = [];

        foreach ($envios as $envio) {
            [$estado, $cuerpo] = $recepcion->recibir($d, $envio);
            $resultados[] = ['secuencia' => $envio['secuencia'], 'estado' => $estado, 'respuesta' => $cuerpo];
        }

        return response()->json(['modo' => $datos['modo'], 'resultados' => $resultados]);
    }
}
