<?php

namespace App\Support;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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

    public static function paginado(LengthAwarePaginator $p): JsonResponse
    {
        return response()->json([
            'data' => $p->items(),
            'meta' => [
                'pagina' => $p->currentPage(),
                'por_pagina' => $p->perPage(),
                'total' => $p->total(),
                'ultima_pagina' => $p->lastPage(),
            ],
        ]);
    }

    public static function porPagina(Request $request): int
    {
        return max(1, min(100, (int) $request->query('por_pagina', 20)));
    }
}
