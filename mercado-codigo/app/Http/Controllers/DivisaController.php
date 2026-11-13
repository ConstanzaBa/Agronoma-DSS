<?php

namespace App\Http\Controllers;

use App\Models\Divisa;
use App\Servicios\ActualizadorMercado;
use App\Servicios\Cotizaciones;
use App\Support\Respuesta;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class DivisaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'tipo' => 'nullable|in:oficial_bna,exportador',
            'desde' => 'nullable|date_format:Y-m-d',
            'hasta' => 'nullable|date_format:Y-m-d',
        ]);

        $consulta = Divisa::query();

        if ($tipo = $request->query('tipo')) {
            $consulta->where('tipo', $tipo);
        }

        if ($desde = $request->query('desde')) {
            $consulta->where('fecha', '>=', $desde);
        }

        if ($hasta = $request->query('hasta')) {
            $consulta->where('fecha', '<=', $hasta);
        }

        return Respuesta::paginado($consulta->orderByDesc('fecha')->orderBy('tipo')->paginate(Respuesta::porPagina($request)));
    }

    public function ultima(Request $request, ActualizadorMercado $actualizador, Cotizaciones $cotizaciones): JsonResponse
    {
        $request->validate(['tipo' => 'nullable|in:oficial_bna,exportador']);

        $actualizador->asegurarHoy();
        $d = $cotizaciones->dolar(now()->toDateString(), $request->query('tipo'));

        if (! $d) {
            return Respuesta::error('sin_datos', 'No hay tipo de cambio cargado', 404);
        }

        return response()->json($d->toArray() + ['desactualizada' => $d->fecha->toDateString() < now()->toDateString()]);
    }

    public function store(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'tipo' => 'required|in:oficial_bna,exportador',
            'fecha' => 'required|date_format:Y-m-d|before_or_equal:today',
            'valor_ars_usd' => 'required|numeric|gt:0|max:99999999',
        ]);

        $d = Divisa::updateOrCreate(
            ['fecha' => $datos['fecha'], 'tipo' => $datos['tipo'], 'fuente' => 'manual'],
            ['valor_ars_usd' => $datos['valor_ars_usd']]
        );
        Log::info('Tipo de cambio cargado a mano', ['id' => $d->id, 'tipo' => $d->tipo, 'usuario_id' => $request->attributes->get('usuario_id')]);

        return response()->json($d, $d->wasRecentlyCreated ? 201 : 200);
    }
}
