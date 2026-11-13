<?php

namespace App\Servicios;

use App\Models\Movimiento;

class StockSilo
{
    /** @return array{entradas_tn:float,salidas_tn:float,stock_tn:float} */
    public function calcular(int $siloId): array
    {
        $fila = Movimiento::where('silo_id', $siloId)
            ->selectRaw("COALESCE(SUM(CASE WHEN direccion = 'in' THEN toneladas ELSE 0 END), 0) AS entradas")
            ->selectRaw("COALESCE(SUM(CASE WHEN direccion = 'out' THEN toneladas ELSE 0 END), 0) AS salidas")
            ->first();

        $entradas = round((float) $fila->entradas, 2);
        $salidas = round((float) $fila->salidas, 2);

        return [
            'entradas_tn' => $entradas,
            'salidas_tn' => $salidas,
            'stock_tn' => round($entradas - $salidas, 2),
        ];
    }
}
