<?php

namespace App\Http\Controllers;

use App\Models\Establecimiento;
use App\Support\Respuesta;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class EstablecimientoController extends Controller
{
    private function reglas(): array
    {
        return [
            'nombre' => 'required|string|max:120',
            'zona_administrativa' => 'nullable|string|max:150',
            'latitud_centro' => 'required|numeric|between:-90,90',
            'longitud_centro' => 'required|numeric|between:-180,180',
            'zoom' => 'nullable|integer|between:1,22',
        ];
    }

    private function buscar(Request $request, int $id): Establecimiento
    {
        return Establecimiento::delContexto($this->contexto($request))->findOrFail($id);
    }

    public function index(Request $request): JsonResponse
    {
        $pagina = Establecimiento::delContexto($this->contexto($request))
            ->orderBy('nombre')
            ->paginate(Respuesta::porPagina($request));

        return Respuesta::paginado($pagina);
    }

    public function store(Request $request): JsonResponse
    {
        if ($excedido = $this->limiteExcedido($request, 'estancias')) {
            return $excedido;
        }

        $datos = $request->validate($this->reglas());
        $datos['zoom'] = $datos['zoom'] ?? 13;
        $contexto = $this->contexto($request);

        $est = Establecimiento::create($datos + ['cuenta_id' => $contexto->cuentaId]);
        Log::info('Establecimiento creado', ['id' => $est->id, 'cuenta_id' => $contexto->cuentaId]);

        return response()->json($est, 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        return response()->json($this->buscar($request, $id));
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $est = $this->buscar($request, $id);
        $datos = $request->validate($this->reglas());
        $datos['zoom'] = $datos['zoom'] ?? $est->zoom;
        $est->update($datos);
        Log::info('Establecimiento editado', ['id' => $est->id]);

        return response()->json($est);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $this->buscar($request, $id)->delete();
        Log::info('Establecimiento dado de baja (borrado lógico)', ['id' => $id]);

        return response()->json(['mensaje' => 'Establecimiento eliminado']);
    }
}
