<?php

namespace App\Http\Controllers;

use App\Models\Establecimiento;
use App\Models\Lote;
use App\Support\Respuesta;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class LoteController extends Controller
{
    private function reglas(): array
    {
        return [
            'nombre' => 'required|string|max:120',
            'coordenadas' => 'required|array|min:3',
            'coordenadas.*' => 'array|size:2',
            'coordenadas.*.*' => 'numeric',
            'superficie_ha' => 'required|numeric|gt:0',
            'tipo_cultivo_id' => 'nullable|integer|exists:tipos_cultivo,id',
            'variedad' => 'nullable|string|max:80',
        ];
    }

    private function buscar(Request $request, int $id): Lote
    {
        return Lote::delContexto($this->contexto($request))->findOrFail($id);
    }

    public function index(Request $request, int $id): JsonResponse
    {
        $est = Establecimiento::delContexto($this->contexto($request))->findOrFail($id);

        return Respuesta::paginado($est->lotes()->orderBy('nombre')->paginate(Respuesta::porPagina($request)));
    }

    public function store(Request $request, int $id): JsonResponse
    {
        $est = Establecimiento::delContexto($this->contexto($request))->findOrFail($id);

        if ($excedido = $this->limiteExcedido($request, 'lotes')) {
            return $excedido;
        }

        $lote = $est->lotes()->create($request->validate($this->reglas()));
        Log::info('Lote creado', ['id' => $lote->id, 'establecimiento_id' => $est->id]);

        return response()->json($lote, 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        return response()->json($this->buscar($request, $id)->load('dispositivos'));
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $lote = $this->buscar($request, $id);
        $lote->update($request->validate($this->reglas()));
        Log::info('Lote editado', ['id' => $lote->id]);

        return response()->json($lote);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $this->buscar($request, $id)->delete();
        Log::info('Lote dado de baja (con sus sensores y lecturas)', ['id' => $id]);

        return response()->json(['mensaje' => 'Lote eliminado']);
    }

    public function todos(Request $request): JsonResponse
    {
        $request->validate(['establecimiento_id' => 'nullable|integer|min:1']);
        $consulta = Lote::delContexto($this->contexto($request));

        if ($request->filled('establecimiento_id')) {
            $consulta->where('establecimiento_id', (int) $request->query('establecimiento_id'));
        }

        return Respuesta::paginado($consulta->orderBy('nombre')->paginate(Respuesta::porPagina($request)));
    }
}
