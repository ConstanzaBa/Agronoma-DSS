<?php

namespace App\Http\Controllers;

use App\Models\Silo;
use App\Servicios\StockSilo;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class InternoController extends Controller
{
    public function resumen(int $id, StockSilo $stock): JsonResponse
    {
        $silo = Silo::findOrFail($id);
        Log::debug('Resumen de silo pedido por otro servicio', ['silo_id' => $silo->id]);

        return response()->json([
            'silo_id' => $silo->id,
            'usuario_id' => $silo->usuario_id,
            'tipo_cultivo_id' => $silo->tipo_cultivo_id,
            'humedad_grano_pct' => $silo->humedad_grano_pct,
            'temperatura_nucleo_c' => $silo->temperatura_nucleo_c,
            'temperatura_limite_c' => $silo->temperatura_limite_c,
            'capacidad_tn' => $silo->capacidad_tn,
            'almacenado_desde' => $silo->almacenado_desde?->format('Y-m-d'),
            'stock_tn' => $stock->calcular($silo->id)['stock_tn'],
        ]);
    }
}
