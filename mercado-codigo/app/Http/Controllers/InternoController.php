<?php

namespace App\Http\Controllers;

use App\Models\RegistroActualizacion;
use App\Servicios\ActualizadorMercado;
use App\Servicios\WebhookCotizaciones;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class InternoController extends Controller
{
    public function actualizarPrecios(ActualizadorMercado $actualizador): JsonResponse
    {
        Log::info('Actualización forzada de precios y divisas');
        $actualizador->asegurarHoy(true);

        return response()->json(['actualizaciones' => RegistroActualizacion::orderByDesc('id')->limit(2)->get()]);
    }

    public function simularWebhook(Request $request, WebhookCotizaciones $webhook): JsonResponse
    {
        $datos = $request->validate([
            'tipo_cultivo_id' => 'nullable|integer|min:1',
            'precio_usd_tn' => 'nullable|numeric|gt:0',
            'repetir' => 'nullable|integer|between:1,5',
            'firma_invalida' => 'nullable|boolean',
        ]);

        $eventId = 'sim-' . Str::random(12);
        $cuerpo = json_encode([
            'event_id' => $eventId,
            'proveedor' => 'proveedor-simulado',
            'datos' => [
                'tipo_cultivo_id' => $datos['tipo_cultivo_id'] ?? 1,
                'fecha' => now()->toDateString(),
                'precio_usd_tn' => $datos['precio_usd_tn'] ?? 301.5,
                'mercado_referencia' => 'ROSARIO',
            ],
        ]);
        $firma = ($datos['firma_invalida'] ?? false)
            ? str_repeat('0', 64)
            : hash_hmac('sha256', $cuerpo, (string) config('agrotech.webhook_secret'));

        Log::info('Simulación de webhook', ['event_id' => $eventId, 'repetir' => $datos['repetir'] ?? 1]);

        $resultados = [];

        for ($i = 1; $i <= ($datos['repetir'] ?? 1); $i++) {
            [$estado, $respuesta] = $webhook->procesar($cuerpo, $firma);
            $resultados[] = ['envio' => $i, 'estado' => $estado, 'respuesta' => $respuesta];
        }

        return response()->json(['event_id' => $eventId, 'resultados' => $resultados]);
    }
}
