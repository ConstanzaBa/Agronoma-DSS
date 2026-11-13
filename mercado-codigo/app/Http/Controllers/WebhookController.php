<?php

namespace App\Http\Controllers;

use App\Servicios\WebhookCotizaciones;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class WebhookController extends Controller
{
    public function cotizaciones(Request $request, WebhookCotizaciones $webhook): JsonResponse
    {
        $cuerpo = $request->getContent();
        Log::debug('Webhook de cotizaciones recibido', ['bytes' => strlen($cuerpo), 'ip' => $request->ip()]);

        [$estado, $respuesta] = $webhook->procesar($cuerpo, $request->header('X-Firma'));

        return response()->json($respuesta, $estado);
    }
}
