<?php

namespace App\Http\Controllers;

use App\Models\Dispositivo;
use App\Models\Lectura;
use App\Models\Lote;
use App\Servicios\RecepcionLecturas;
use App\Support\Respuesta;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

class LecturaController extends Controller
{
    public function store(Request $request, RecepcionLecturas $recepcion): JsonResponse
    {
        $id = $request->attributes->get('dispositivo_id');
        $dispositivo = Dispositivo::with('lote.establecimiento')->find($id);

        if (! $dispositivo || ! $dispositivo->activo) {
            Log::warning('Lectura de un dispositivo inexistente o inactivo', ['dispositivo_id' => $id]);

            return Respuesta::error('sin_permiso', 'Dispositivo inexistente o inactivo', 403);
        }

        $datos = $request->validate([
            'secuencia' => 'required|integer|min:0',
            'humedad_suelo_pct' => 'required|numeric|between:0,100',
            'humedad_aire_pct' => 'required|numeric|between:0,100',
            'temperatura_c' => 'required|numeric|between:-60,80',
            'precipitacion_mm' => 'nullable|numeric|min:0',
            'medido_en' => 'required|date',
        ]);

        [$estado, $cuerpo] = $recepcion->recibir($dispositivo, $datos);

        return response()->json($cuerpo, $estado);
    }

    public function index(Request $request, int $id): JsonResponse
    {
        $request->validate(['desde' => 'nullable|date', 'hasta' => 'nullable|date']);
        $lote = Lote::delContexto($this->contexto($request))->findOrFail($id);
        $consulta = Lectura::where('lote_id', $lote->id);

        if ($desde = $request->query('desde')) {
            $consulta->where('medido_en', '>=', Carbon::parse($desde)->utc());
        }

        if ($hasta = $request->query('hasta')) {
            $fin = Carbon::parse($hasta);
            $fin = strlen($hasta) === 10 ? $fin->endOfDay() : $fin;
            $consulta->where('medido_en', '<=', $fin->utc());
        }

        Log::debug('Historial de lecturas consultado', ['lote_id' => $lote->id, 'desde' => $desde, 'hasta' => $hasta]);

        return Respuesta::paginado($consulta->orderByDesc('medido_en')->paginate(Respuesta::porPagina($request)));
    }
}
