<?php

namespace App\Http\Controllers;

use App\Servicios\CircuitBreaker;
use App\Servicios\ClienteServicios;
use App\Support\Respuesta;
use Illuminate\Http\Client\Pool;
use Illuminate\Http\Client\Response as RespuestaHttp;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ResumenController extends Controller
{
    private const PEDIDOS = [
        'lotes' => ['campo', 'lotes?por_pagina=100'],
        'silos' => ['silos', 'silos?por_pagina=100'],
        'alertas' => ['alertas', 'alertas?estado=active&por_pagina=50'],
    ];

    public function __construct(private ClienteServicios $clientes) {}

    public function show(Request $request): JsonResponse
    {
        $identidad = $request->attributes->get('identidad');

        if (($identidad['autenticable'] ?? '') !== 'usuario') {
            return Respuesta::error('sin_permiso', 'El resumen es solo para personas', 403);
        }

        $cabeceras = $this->clientes->cabeceras($identidad, $request->attributes->get('id_solicitud'));
        $bloques = array_fill_keys(array_keys(self::PEDIDOS), null);
        $disponibles = [];

        foreach (self::PEDIDOS as $bloque => [$servicio]) {
            $breaker = new CircuitBreaker($servicio);

            if ($breaker->permitido()) {
                $disponibles[$bloque] = $breaker;
            } else {
                Log::warning('Resumen: circuito abierto, el bloque va en null', ['servicio' => $servicio]);
            }
        }

        if ($disponibles) {
            $respuestas = Http::pool(function (Pool $pool) use ($disponibles, $cabeceras) {
                $pedidos = [];

                foreach (array_keys($disponibles) as $bloque) {
                    [$servicio, $ruta] = self::PEDIDOS[$bloque];
                    $pedidos[] = $pool->as($bloque)
                        ->withHeaders($cabeceras)
                        ->timeout($this->clientes->timeout($servicio))
                        ->get($this->clientes->url($servicio, $ruta));
                }

                return $pedidos;
            });

            foreach ($disponibles as $bloque => $breaker) {
                $r = $respuestas[$bloque] ?? null;

                if ($r instanceof RespuestaHttp && ! ClienteServicios::esFallo($r)) {
                    $breaker->exito();

                    if ($r->successful()) {
                        $bloques[$bloque] = $r->json();
                    } else {
                        Log::warning('Resumen: el servicio respondió con error', ['bloque' => $bloque, 'estado' => $r->status()]);
                    }

                    continue;
                }

                $breaker->fallo();
                Log::warning('Resumen: el servicio no respondió', ['bloque' => $bloque]);
            }
        }

        return response()->json($bloques + ['parcial' => in_array(null, $bloques, true)]);
    }
}
