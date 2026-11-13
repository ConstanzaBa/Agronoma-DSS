<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class SaludController extends Controller
{
    public function live(): JsonResponse
    {
        return response()->json(['estado' => 'ok']);
    }

    public function ready(): JsonResponse
    {
        $faltan = [];

        if (! config('servicios.secreto')) {
            $faltan[] = 'GATEWAY_SECRET';
        }

        foreach (config('servicios.servicios') as $nombre => $datos) {
            if (empty($datos['url'])) {
                $faltan[] = 'SERVICIO_' . strtoupper($nombre) . '_URL';
            }
        }

        if ($faltan) {
            Log::error('Health ready: falta configuración', ['faltan' => $faltan]);

            return response()->json(['estado' => 'error', 'faltan' => $faltan], 503);
        }

        return response()->json(['estado' => 'ok']);
    }
}
