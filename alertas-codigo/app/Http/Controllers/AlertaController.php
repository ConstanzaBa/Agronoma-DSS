<?php

namespace App\Http\Controllers;

use App\Models\Alerta;
use App\Support\Respuesta;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AlertaController extends Controller
{
    private function buscar(Request $request, int $id): Alerta
    {
        return Alerta::visiblesPara($request)->findOrFail($id); // ajena → 404
    }

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'estado' => 'nullable|in:active,attended,resolved',
            'tipo' => 'nullable|in:moisture,silo_temp,no_rain,market,price_target',
            'desde_id' => 'nullable|integer|min:0',
        ]);

        $consulta = Alerta::visiblesPara($request);

        if ($estado = $request->query('estado')) {
            $consulta->where('estado', $estado);
        }

        if ($tipo = $request->query('tipo')) {
            $consulta->where('tipo', $tipo);
        }

        if ($request->filled('desde_id')) {
            $consulta->where('id', '>', (int) $request->query('desde_id'));
        }

        return Respuesta::paginado($consulta->orderByDesc('id')->paginate(Respuesta::porPagina($request)));
    }

    public function show(Request $request, int $id): JsonResponse
    {
        return response()->json($this->buscar($request, $id));
    }

    public function atender(Request $request, int $id): JsonResponse
    {
        $alerta = $this->buscar($request, $id);

        if ($alerta->estado === 'resolved') {
            return Respuesta::error('transicion_invalida', 'La alerta ya está resuelta', 409);
        }

        if ($alerta->estado === 'active') {
            $alerta->update(['estado' => 'attended', 'atendida_en' => now()]);
            Log::info('Alerta atendida', ['alerta_id' => $alerta->id]);
        }

        return response()->json($alerta);
    }

    public function resolver(Request $request, int $id): JsonResponse
    {
        $alerta = $this->buscar($request, $id);

        if ($alerta->estado !== 'resolved') {
            $alerta->update(['estado' => 'resolved', 'resuelta_en' => now()]);
            Log::info('Alerta resuelta', ['alerta_id' => $alerta->id]);
        }

        return response()->json($alerta);
    }

    public function feed(Request $request): StreamedResponse
    {
        $uid = $request->attributes->get('usuario_id');
        $ultimo = (int) ($request->header('Last-Event-ID') ?: $request->query('desde_id', 0));

        if ($ultimo === 0) {
            $ultimo = (int) Alerta::visiblesPara($request)->max('id');   // sin punto de partida: solo las nuevas desde ahora
        }

        Log::info('Feed SSE abierto', ['usuario_id' => $uid, 'desde_id' => $ultimo]);

        return response()->stream(function () use ($request, $ultimo) {
            @set_time_limit(40);
            @ini_set('zlib.output_compression', '0');
            $inicio = time();

            echo "retry: 3000\n\n";
            $this->vaciar();

            while (time() - $inicio < 25 && ! connection_aborted()) {
                $nuevas = Alerta::visiblesPara($request)->where('id', '>', $ultimo)->orderBy('id')->limit(50)->get();

                foreach ($nuevas as $alerta) {
                    echo "id: {$alerta->id}\nevent: alerta\ndata: " . $alerta->toJson() . "\n\n";
                    $ultimo = $alerta->id;
                }

                if ($nuevas->isEmpty()) {
                    echo ": keep-alive\n\n";
                }

                $this->vaciar();
                sleep(2);
            }
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    private function vaciar(): void
    {
        if (ob_get_level() > 0) {
            @ob_flush();
        }

        flush();
    }
}
