<?php

namespace App\Servicios;

use App\Models\SupuestoMargen;

class CalculadoraMargen
{
    public function __construct(private Cotizaciones $cotizaciones) {}

    /** @return array{disponible:bool,motivo?:string} más los datos del cálculo cuando está disponible */
    public function calcular(int $usuarioId, int $cultivoId): array
    {
        $s = SupuestoMargen::where('usuario_id', $usuarioId)->where('tipo_cultivo_id', $cultivoId)->first();

        if (! $s) {
            return ['disponible' => false, 'motivo' => 'supuestos_no_cargados'];
        }

        $cot = $this->cotizaciones->ultima($cultivoId);

        if (! $cot) {
            return ['disponible' => false, 'motivo' => 'sin_precio'];
        }

        $dolar = $this->cotizaciones->dolar(now()->toDateString());

        $bruto = $cot->precio_usd_tn * $s->rinde_tn_ha;
        $ingreso = $bruto * (1 - $s->retencion_pct / 100);
        $costos = $s->costo_directo_usd_ha + $s->costo_fertilizante_usd_ha + $bruto * $s->costo_comercial_pct / 100;
        $margen = $ingreso - $costos;

        return [
            'disponible' => true,
            'tipo_cultivo_id' => $cultivoId,
            'margen_usd_ha' => round($margen, 2),
            'margen_ars_ha' => $dolar ? round($margen * $dolar->valor_ars_usd, 2) : null,
            'ingreso_usd_ha' => round($ingreso, 2),
            'costos_usd_ha' => round($costos, 2),
            'precio' => [
                'precio_usd_tn' => $cot->precio_usd_tn,
                'fecha' => $cot->fecha_cotizacion->toDateString(),
                'fuente' => $cot->fuente,
                'mercado_referencia' => $cot->mercado_referencia,
                'desactualizada' => $this->cotizaciones->esAntigua($cot),
            ],
            'dolar' => $dolar ? [
                'tipo' => $dolar->tipo,
                'valor_ars_usd' => $dolar->valor_ars_usd,
                'fecha' => $dolar->fecha->toDateString(),
                'fuente' => $dolar->fuente,
            ] : null,
            'supuestos' => $s->only(['rinde_tn_ha', 'costo_directo_usd_ha', 'costo_fertilizante_usd_ha', 'costo_comercial_pct', 'retencion_pct']),
        ];
    }
}
