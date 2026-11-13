<?php

namespace App\Http\Controllers;

use App\Servicios\CircuitBreaker;
use App\Servicios\ClienteServicios;
use Illuminate\Http\Client\Pool;
use Illuminate\Http\Client\Response as RespuestaHttp;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class EstadoController extends Controller
{
    public function __construct(private ClienteServicios $clientes) {}

    public function show(): JsonResponse
    {
        $nombres = array_keys(config('servicios.servicios'));

        $respuestas = Http::pool(function (Pool $pool) use ($nombres) {
            $pedidos = [];

            foreach ($nombres as $nombre) {
                $pedidos[] = $pool->as($nombre)->timeout(3)->get($this->clientes->base($nombre) . '/health/ready');
            }

            return $pedidos;
        });

        $servicios = [];

        foreach ($nombres as $nombre) {
            $r = $respuestas[$nombre] ?? null;
            $circuito = (new CircuitBreaker($nombre))->estado();

            if ($r instanceof RespuestaHttp) {
                $segundos = $r->transferStats?->getTransferTime();
                $servicios[$nombre] = [
                    'estado' => $r->successful() ? 'ok' : 'degradado',
                    'http' => $r->status(),
                    'ms' => $segundos !== null ? (int) round($segundos * 1000) : null,
                    'circuito' => $circuito,
                    'detalle' => $r->json(),
                ];
            } else {
                $servicios[$nombre] = ['estado' => 'caido', 'http' => null, 'ms' => null, 'circuito' => $circuito, 'detalle' => null];
            }
        }

        $general = collect($servicios)->every(fn($s) => $s['estado'] === 'ok') ? 'ok' : 'degradado';
        Log::info('Estado consultado', ['general' => $general]);

        return response()->json(['general' => $general, 'servicios' => $servicios]);
    }
}
