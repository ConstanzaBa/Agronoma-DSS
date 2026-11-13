<?php

namespace App\Http\Controllers;

use App\Eventos\Evento;
use App\Eventos\PublicadorEventos;
use App\Models\Silo;
use App\Servicios\StockSilo;
use App\Support\Respuesta;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SiloController extends Controller
{
    private function reglas(): array
    {
        return [
            'nombre' => 'required|string|max:80',
            'tipo' => 'required|in:silo,silobolsa',
            'capacidad_tn' => 'required|numeric|gt:0|max:99999999',
            'tipo_cultivo_id' => 'nullable|integer|min:1',
            'temperatura_limite_c' => 'nullable|numeric|between:-50,99.9',
        ];
    }

    private function buscar(Request $request, int $id): Silo
    {
        return Silo::delUsuario($request->attributes->get('usuario_id'))->findOrFail($id);
    }

    public function index(Request $request): JsonResponse
    {
        $consulta = Silo::delUsuario($request->attributes->get('usuario_id'));

        if ($request->filled('establecimiento_id')) {
            $consulta->where('establecimiento_id', (int) $request->query('establecimiento_id'));
        }

        return Respuesta::paginado($consulta->orderBy('nombre')->paginate(Respuesta::porPagina($request)));
    }

    public function store(Request $request): JsonResponse
    {
        $datos = $request->validate($this->reglas() + ['establecimiento_id' => 'required|integer|min:1']);
        $datos['temperatura_limite_c'] = $datos['temperatura_limite_c'] ?? 25;
        $uid = $request->attributes->get('usuario_id');

        $silo = Silo::create($datos + ['usuario_id' => $uid]);
        Log::info('Silo creado', ['id' => $silo->id, 'usuario_id' => $uid, 'tipo' => $silo->tipo]);

        return response()->json($silo, 201);
    }

    public function show(Request $request, int $id, StockSilo $stock): JsonResponse
    {
        $silo = $this->buscar($request, $id);

        return response()->json($silo->toArray() + $stock->calcular($silo->id));
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $silo = $this->buscar($request, $id);
        $datos = $request->validate($this->reglas());
        $datos['temperatura_limite_c'] = $datos['temperatura_limite_c'] ?? 25;
        $silo->update($datos);
        Log::info('Silo editado', ['id' => $silo->id]);

        return response()->json($silo);
    }

    public function mediciones(Request $request, int $id, PublicadorEventos $publicador): JsonResponse
    {
        $silo = $this->buscar($request, $id);
        $datos = $request->validate([
            'humedad_grano_pct' => 'required|numeric|between:0,99.99',
            'temperatura_nucleo_c' => 'required|numeric|between:-50,99.9',
        ]);

        $silo->update($datos);
        Log::info('Medición registrada', ['silo_id' => $silo->id, 'temperatura_nucleo_c' => $silo->temperatura_nucleo_c]);

        $publicador->publicar('silo.temperatura', Evento::crear('silo_temperatura', [
            'silo_id' => $silo->id,
            'usuario_id' => $silo->usuario_id,
            'temperatura_nucleo_c' => (float) $silo->temperatura_nucleo_c,
            'temperatura_limite_c' => (float) $silo->temperatura_limite_c,
        ]));

        return response()->json($silo);
    }

    public function stock(Request $request, int $id, StockSilo $stock): JsonResponse
    {
        $silo = $this->buscar($request, $id);
        $calculo = $stock->calcular($silo->id);

        return response()->json([
            'silo_id' => $silo->id,
            'capacidad_tn' => $silo->capacidad_tn,
            'ocupacion_pct' => round($calculo['stock_tn'] / $silo->capacidad_tn * 100, 1),
        ] + $calculo);
    }
}
