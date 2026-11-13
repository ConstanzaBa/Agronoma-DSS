<?php

namespace App\Http\Controllers;

use App\Models\ReglaAlerta;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ReglaController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => ReglaAlerta::orderBy('tipo')->orderBy('severidad')->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'tipo' => 'required|in:moisture,silo_temp,no_rain,market,price_target',
            'severidad' => 'required|in:critical,warning,info',
            'parametros' => 'required|array',
            'activa' => 'nullable|boolean',
        ]);

        $regla = ReglaAlerta::create($datos + ['activa' => true]);
        Log::info('Regla creada', ['id' => $regla->id, 'usuario_id' => $request->attributes->get('usuario_id')]);

        return response()->json($regla, 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $regla = ReglaAlerta::findOrFail($id);
        $datos = $request->validate([
            'severidad' => 'nullable|in:critical,warning,info',
            'parametros' => 'required|array',
            'activa' => 'nullable|boolean',
        ]);

        $regla->update(array_filter($datos, fn($v) => $v !== null));
        Log::info('Regla editada', ['id' => $regla->id, 'usuario_id' => $request->attributes->get('usuario_id')]);

        return response()->json($regla);
    }
}
