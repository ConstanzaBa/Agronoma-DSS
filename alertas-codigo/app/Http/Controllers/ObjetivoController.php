<?php

namespace App\Http\Controllers;

use App\Models\ObjetivoPrecio;
use App\Support\Respuesta;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ObjetivoController extends Controller
{
    private function reglas(): array
    {
        return [
            'tipo_cultivo_id' => 'required|integer|min:1',
            'moneda' => 'required|in:USD,ARS',
            'direccion' => 'required|in:sube,baja',
            'umbral' => 'required|numeric|gt:0|max:9999999999',
        ];
    }

    private function buscar(Request $request, int $id): ObjetivoPrecio
    {
        return ObjetivoPrecio::visiblesPara($request)->findOrFail($id);
    }

    public function index(Request $request): JsonResponse
    {
        $consulta = ObjetivoPrecio::visiblesPara($request);

        if ($request->filled('activo')) {
            $consulta->where('activo', $request->boolean('activo'));
        }

        return Respuesta::paginado($consulta->orderByDesc('id')->paginate(Respuesta::porPagina($request)));
    }

    public function store(Request $request): JsonResponse
    {
        $datos = $request->validate($this->reglas());
        $uid = $request->attributes->get('usuario_id');

        // Sin clave de idempotencia en la tabla: el mismo objetivo no se duplica.
        $cuenta = $request->attributes->get('cuenta_id'); // de la identidad, nunca del body

        $existente = ObjetivoPrecio::where('cuenta_id', $cuenta)
            ->where('tipo_cultivo_id', $datos['tipo_cultivo_id'])
            ->where('moneda', $datos['moneda'])
            ->where('direccion', $datos['direccion'])
            ->where('umbral', $datos['umbral'])
            ->first();

        if ($existente) {
            Log::info('Objetivo repetido: se devuelve el existente', ['id' => $existente->id]);

            return response()->json($existente, 200);
        }

        $objetivo = ObjetivoPrecio::create($datos + ['cuenta_id' => $cuenta, 'usuario_id' => $uid, 'activo' => true]);
        Log::info('Objetivo de precio creado', ['id' => $objetivo->id, 'cuenta_id' => $cuenta, 'usuario_id' => $uid]);

        return response()->json($objetivo, 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $objetivo = $this->buscar($request, $id);
        $datos = $request->validate($this->reglas() + ['activo' => 'nullable|boolean']);

        $cambioCondicion = (float) $datos['umbral'] !== $objetivo->umbral || $datos['direccion'] !== $objetivo->direccion;

        $objetivo->fill(array_filter($datos, fn($v) => $v !== null));

        if ($cambioCondicion) {
            $objetivo->ultimo_disparo_en = null;   // la condición cambió: puede volver a avisar
        }

        $objetivo->save();
        Log::info('Objetivo de precio editado', ['id' => $objetivo->id]);

        return response()->json($objetivo);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $this->buscar($request, $id)->delete();
        Log::info('Objetivo de precio eliminado', ['id' => $id]);

        return response()->json(['mensaje' => 'Objetivo eliminado']);
    }
}
