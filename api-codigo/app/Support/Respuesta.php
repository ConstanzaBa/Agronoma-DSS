<?php

namespace App\Support;

use Illuminate\Http\JsonResponse;

class Respuesta
{
    public static function error(string $codigo, string $mensaje, int $estado, array $detalles = []): JsonResponse
    {
        $cuerpo = ['codigo' => $codigo, 'mensaje' => $mensaje];

        if ($detalles) {
            $cuerpo['detalles'] = $detalles;
        }

        return response()->json($cuerpo, $estado);
    }
}
