<?php

namespace App\Http\Controllers;

use App\Servicios\ActualizadorMercado;
use App\Servicios\CalculadoraMargen;
use App\Support\Respuesta;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class MargenController extends Controller
{
    public function show(Request $request, int $tipo_cultivo_id, ActualizadorMercado $actualizador, CalculadoraMargen $calculadora): JsonResponse
    {
        $actualizador->asegurarHoy();
        $r = $calculadora->calcular($request->attributes->get('usuario_id'), $tipo_cultivo_id);

        if (! $r['disponible']) {
            Log::info('Margen no disponible', ['motivo' => $r['motivo'], 'tipo_cultivo_id' => $tipo_cultivo_id]);

            return $r['motivo'] === 'sin_precio'
                ? Respuesta::error('sin_datos', 'No hay cotización de ese cultivo', 404)
                : Respuesta::error('supuestos_no_cargados', 'Cargá tus supuestos de margen para este cultivo', 404);
        }

        unset($r['disponible']);

        return response()->json($r);
    }
}
