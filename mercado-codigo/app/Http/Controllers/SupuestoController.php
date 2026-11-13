<?php

namespace App\Http\Controllers;

use App\Models\SupuestoMargen;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SupuestoController extends Controller
{
    public function show(Request $request, int $tipo_cultivo_id): JsonResponse
    {
        $s = SupuestoMargen::where('usuario_id', $request->attributes->get('usuario_id'))
            ->where('tipo_cultivo_id', $tipo_cultivo_id)
            ->firstOrFail();

        return response()->json($s);
    }

    public function update(Request $request, int $tipo_cultivo_id): JsonResponse
    {
        $datos = $request->validate([
            'rinde_tn_ha' => 'required|numeric|gt:0|max:9999',
            'costo_directo_usd_ha' => 'required|numeric|min:0|max:99999999',
            'costo_fertilizante_usd_ha' => 'nullable|numeric|min:0|max:99999999',
            'costo_comercial_pct' => 'nullable|numeric|between:0,100',
            'retencion_pct' => 'nullable|numeric|between:0,100',
        ]);
        $uid = $request->attributes->get('usuario_id');

        $s = SupuestoMargen::updateOrCreate(
            ['usuario_id' => $uid, 'tipo_cultivo_id' => $tipo_cultivo_id],
            [
                'rinde_tn_ha' => $datos['rinde_tn_ha'],
                'costo_directo_usd_ha' => $datos['costo_directo_usd_ha'],
                'costo_fertilizante_usd_ha' => $datos['costo_fertilizante_usd_ha'] ?? 0,
                'costo_comercial_pct' => $datos['costo_comercial_pct'] ?? 0,
                'retencion_pct' => $datos['retencion_pct'] ?? 0,
            ]
        );
        Log::info('Supuestos de margen guardados', ['usuario_id' => $uid, 'tipo_cultivo_id' => $tipo_cultivo_id]);

        return response()->json($s);
    }
}
