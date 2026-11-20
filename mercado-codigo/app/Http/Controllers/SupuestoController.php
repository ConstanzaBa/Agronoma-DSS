<?php

namespace App\Http\Controllers;

use App\Models\SupuestoMargen;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SupuestoController extends Controller
{
    private function propios(Request $request)
    {
        return SupuestoMargen::deCuenta($request->attributes->get('cuenta_id'), $request->attributes->get('usuario_id'))
            ->orderByRaw('cuenta_id IS NULL'); // si coexisten, primero el de la cuenta
    }

    public function show(Request $request, int $tipo_cultivo_id): JsonResponse
    {
        $s = $this->propios($request)->where('tipo_cultivo_id', $tipo_cultivo_id)->firstOrFail();

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

        $cuenta = $request->attributes->get('cuenta_id'); // de la identidad, nunca del body

        // Un supuesto previo sin cuenta (cargado por este usuario) se adopta en lugar de duplicarlo.
        $s = $this->propios($request)->where('tipo_cultivo_id', $tipo_cultivo_id)->first()
            ?? new SupuestoMargen(['usuario_id' => $uid, 'tipo_cultivo_id' => $tipo_cultivo_id]);

        $s->fill([
            'cuenta_id' => $cuenta,
            'rinde_tn_ha' => $datos['rinde_tn_ha'],
            'costo_directo_usd_ha' => $datos['costo_directo_usd_ha'],
            'costo_fertilizante_usd_ha' => $datos['costo_fertilizante_usd_ha'] ?? 0,
            'costo_comercial_pct' => $datos['costo_comercial_pct'] ?? 0,
            'retencion_pct' => $datos['retencion_pct'] ?? 0,
        ])->save();
        Log::info('Supuestos de margen guardados', ['cuenta_id' => $cuenta, 'usuario_id' => $uid, 'tipo_cultivo_id' => $tipo_cultivo_id]);

        return response()->json($s);
    }
}
