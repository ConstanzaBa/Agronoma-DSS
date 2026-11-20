<?php

namespace App\Http\Controllers;

use App\Models\ReglaAlerta;
use App\Support\Respuesta;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ReglaController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => ReglaAlerta::orderBy('tipo')->orderBy('severidad')->get()]);
    }

    // Las reglas son configuración global del sistema (compartida por todas las cuentas):
    // ninguna cuenta puede modificarlas hasta definirse reglas por cuenta o un administrador global.
    public function store(Request $request): JsonResponse
    {
        return $this->globales($request);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        return $this->globales($request);
    }

    private function globales(Request $request): JsonResponse
    {
        Log::warning('Intento de modificar reglas globales', ['usuario_id' => $request->attributes->get('usuario_id'), 'cuenta_id' => $request->attributes->get('cuenta_id')]);

        return Respuesta::error('reglas_globales', 'Las reglas de alerta son globales y no se editan desde una cuenta', 403);
    }
}
