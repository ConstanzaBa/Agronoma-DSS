<?php

namespace App\Http\Controllers;

use App\Models\Cuenta;
use App\Support\Respuesta;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class CuentaController extends Controller
{
    /** GET /cuenta: plan, límites y uso de la cuenta del administrador. */
    public function show(Request $request): JsonResponse
    {
        return response()->json($this->armar(Cuenta::findOrFail($this->contexto($request)->cuentaId)));
    }

    /** PUT /cuenta/plan: cambio de plan simulado. Un plan menor se rechaza si el uso actual no cabe en él. */
    public function cambiarPlan(Request $request): JsonResponse
    {
        $datos = $request->validate(['plan' => ['required', 'string', Rule::in(array_keys(config('planes')))]]);
        $cuenta = Cuenta::findOrFail($this->contexto($request)->cuentaId);
        $uso = $cuenta->uso();

        $excedidos = [];

        foreach ($cuenta->limites($datos['plan']) as $recurso => $limite) {
            if ($limite !== null && $uso[$recurso] > $limite) {
                $excedidos[$recurso] = ['uso' => $uso[$recurso], 'limite' => $limite];
            }
        }

        if ($excedidos) {
            return Respuesta::error('plan_incompatible', 'El uso actual supera los límites del plan elegido', 409, $excedidos);
        }

        $anterior = $cuenta->plan;
        $cuenta->update(['plan' => $datos['plan']]);
        Log::info('Plan de cuenta cambiado', ['cuenta_id' => $cuenta->id, 'de' => $anterior, 'a' => $cuenta->plan]);

        return response()->json($this->armar($cuenta));
    }

    private function armar(Cuenta $cuenta): array
    {
        return [
            'id' => $cuenta->id,
            'plan' => $cuenta->plan,
            'estado' => $cuenta->estado,
            'limites' => $cuenta->limites(),
            'uso' => $cuenta->uso(),
        ];
    }
}
