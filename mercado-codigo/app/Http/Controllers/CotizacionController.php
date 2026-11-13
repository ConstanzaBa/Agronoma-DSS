<?php

namespace App\Http\Controllers;

use App\Models\CotizacionGrano;
use App\Servicios\ActualizadorMercado;
use App\Servicios\Cotizaciones;
use App\Support\Respuesta;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class CotizacionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'tipo_cultivo_id' => 'required|integer|min:1',
            'desde' => 'nullable|date_format:Y-m-d',
            'hasta' => 'nullable|date_format:Y-m-d',
        ]);

        $consulta = CotizacionGrano::where('tipo_cultivo_id', (int) $request->query('tipo_cultivo_id'));

        if ($desde = $request->query('desde')) {
            $consulta->where('fecha_cotizacion', '>=', $desde);
        }

        if ($hasta = $request->query('hasta')) {
            $consulta->where('fecha_cotizacion', '<=', $hasta);
        }

        return Respuesta::paginado(
            $consulta->orderByDesc('fecha_cotizacion')
                ->orderByRaw("FIELD(fuente, 'manual', 'webhook', 'api')")
                ->paginate(Respuesta::porPagina($request))
        );
    }

    public function ultima(Request $request, ActualizadorMercado $actualizador, Cotizaciones $cotizaciones): JsonResponse
    {
        $request->validate(['tipo_cultivo_id' => 'required|integer|min:1']);

        $actualizador->asegurarHoy();   // actualización perezosa (sección 7.4)
        $c = $cotizaciones->ultima((int) $request->query('tipo_cultivo_id'));

        if (! $c) {
            Log::info('Cotización pedida sin datos', ['tipo_cultivo_id' => $request->query('tipo_cultivo_id')]);

            return Respuesta::error('sin_datos', 'No hay cotizaciones para ese cultivo', 404);
        }

        return response()->json($c->toArray() + ['desactualizada' => $cotizaciones->esAntigua($c)]);
    }

    public function store(Request $request, Cotizaciones $cotizaciones): JsonResponse
    {
        $datos = $request->validate([
            'tipo_cultivo_id' => 'required|integer|min:1',
            'fecha_cotizacion' => 'required|date_format:Y-m-d|before_or_equal:today',
            'precio_usd_tn' => 'required|numeric|gt:0|max:99999999',
            'mercado_referencia' => 'required|in:CBOT,ROSARIO',
        ]);

        $c = $cotizaciones->guardar(
            (int) $datos['tipo_cultivo_id'],
            $datos['fecha_cotizacion'],
            (float) $datos['precio_usd_tn'],
            $datos['mercado_referencia'],
            'manual',
            $request->attributes->get('usuario_id')
        );
        Log::info('Cotización cargada a mano', ['id' => $c->id, 'usuario_id' => $c->creado_por]);
        $cotizaciones->publicar($c);

        return response()->json($c, $c->wasRecentlyCreated ? 201 : 200);
    }
}
