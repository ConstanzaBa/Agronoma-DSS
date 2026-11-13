<?php

namespace App\Http\Controllers;

use App\Eventos\Evento;
use App\Eventos\PublicadorEventos;
use App\Models\ResultadoIndiceVenta;
use App\Proveedores\SilosCliente;
use App\Servicios\ActualizadorMercado;
use App\Servicios\CalculadorIndiceVenta;
use App\Support\Respuesta;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class IndiceVentaController extends Controller
{
    public function show(
        Request $request,
        int $silo_id,
        SilosCliente $silos,
        ActualizadorMercado $actualizador,
        CalculadorIndiceVenta $calculador,
        PublicadorEventos $publicador
    ): JsonResponse {
        $uid = $request->attributes->get('usuario_id');

        try {
            $resumen = $silos->resumen($silo_id);
        } catch (\Throwable $e) {
            Log::error('No se pudo consultar silos', ['silo_id' => $silo_id, 'error' => $e->getMessage()]);

            return Respuesta::error('servicio_no_disponible', 'El servicio de silos no responde', 503);
        }

        if (! $resumen || (int) ($resumen['usuario_id'] ?? 0) !== $uid) {
            return Respuesta::error('no_encontrado', 'Recurso inexistente', 404);
        }

        $actualizador->asegurarHoy();
        $resultado = $calculador->calcular($resumen, $uid);
        Log::info('Índice de venta calculado', ['silo_id' => $silo_id, 'puntaje' => $resultado['puntaje'], 'veredicto' => $resultado['veredicto']]);

        $publicador->publicar('indice.venta', Evento::crear('indice_venta_calculado', [
            'silo_id' => $silo_id,
            'usuario_id' => $uid,
            'puntaje' => $resultado['puntaje'],
            'veredicto' => $resultado['veredicto'],
        ]));

        return response()->json($resultado);
    }

    public function historial(Request $request, int $silo_id): JsonResponse
    {
        $pagina = ResultadoIndiceVenta::where('silo_id', $silo_id)
            ->where('usuario_id', $request->attributes->get('usuario_id'))
            ->orderByDesc('calculado_en')
            ->orderByDesc('id')
            ->paginate(Respuesta::porPagina($request));

        return Respuesta::paginado($pagina);
    }
}
