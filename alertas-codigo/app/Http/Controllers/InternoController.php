<?php

namespace App\Http\Controllers;

use App\Excepciones\EventoInvalido;
use App\Jobs\ProcesarEvento;
use App\Servicios\ProcesadorCola;
use App\Servicios\ValidadorEventos;
use App\Support\Respuesta;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class InternoController extends Controller
{
    public function eventos(Request $request, ValidadorEventos $validador): JsonResponse
    {
        $datos = $request->validate(['routing_key' => 'required|string|max:60', 'evento' => 'required|array']);

        try {
            $validador->validar($datos['evento']);
        } catch (EventoInvalido $e) {
            Log::warning('Evento rechazado en la entrada', ['routing_key' => $datos['routing_key'], 'errores' => $e->errores]);

            return Respuesta::error('validacion', 'Evento inválido', 422, $e->errores);
        }

        ProcesarEvento::dispatch($datos['evento'])->onQueue('alertas.eventos');
        Log::info('Evento encolado', ['routing_key' => $datos['routing_key'], 'event_id' => $datos['evento']['event_id']]);

        // Laravel responde primero y después procesa la cola en el mismo pedido (tu sección 8.7).
        dispatch(fn() => app(ProcesadorCola::class)->drenar(15))->afterResponse();

        return response()->json(['encolado' => true, 'event_id' => $datos['evento']['event_id']], 202);
    }

    public function procesarCola(ProcesadorCola $procesador): JsonResponse
    {
        Log::info('Procesamiento manual de la cola');

        return response()->json($procesador->drenar(20));
    }
}
