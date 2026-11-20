<?php

namespace App\Servicios;

use App\Models\ResultadoIndiceVenta;

class CalculadorIndiceVenta
{
    private const UMBRAL_VENTA = 80;
    private const UMBRAL_REVISAR = 50;

    public function __construct(private CalculadoraMargen $margen, private Cotizaciones $cotizaciones) {}

    /** @param array $silo respuesta de silos /interno/silos/{id}/resumen */
    public function calcular(array $silo, int $cuentaId, int $usuarioId): array
    {
        $cultivoId = ! empty($silo['tipo_cultivo_id']) ? (int) $silo['tipo_cultivo_id'] : null;
        $margen = $cultivoId
            ? $this->margen->calcular($cuentaId, $usuarioId, $cultivoId)
            : ['disponible' => false, 'motivo' => 'sin_cultivo'];
        $tendencia = $cultivoId
            ? $this->cotizaciones->tendencia($cultivoId)
            : ['puntos' => 0, 'actual' => null, 'promedio' => null];
        $stock = (float) ($silo['stock_tn'] ?? 0);

        $reglas = [
            $this->reglaMargen($margen),
            $this->reglaTendencia($tendencia),
            $this->reglaHumedad($silo['humedad_grano_pct'] ?? null),
            $this->reglaTemperatura($silo['temperatura_nucleo_c'] ?? null, $silo['temperatura_limite_c'] ?? null),
            $this->reglaStock($stock),
        ];

        $puntaje = (int) array_sum(array_map(fn($r) => $r['pass'] ? $r['weight'] : 0, $reglas));
        $veredicto = $puntaje >= self::UMBRAL_VENTA ? 'sell' : ($puntaje >= self::UMBRAL_REVISAR ? 'review' : 'wait');

        if ($stock <= 0) {
            $veredicto = 'wait';
        }

        $resultado = ResultadoIndiceVenta::create([
            'cuenta_id' => $cuentaId,
            'usuario_id' => $usuarioId,
            'silo_id' => (int) $silo['silo_id'],
            'puntaje' => $puntaje,
            'veredicto' => $veredicto,
            'reglas_aplicadas' => $reglas,
            'calculado_en' => now(),
        ]);

        return [
            'silo_id' => $resultado->silo_id,
            'puntaje' => $puntaje,
            'veredicto' => $veredicto,
            'reglas_aplicadas' => $reglas,
            'calculado_en' => $resultado->calculado_en->toIso8601String(),
        ];
    }

    private function regla(string $id, string $label, int $peso, string $sub, bool $pasa, string $detalle, string $pista): array
    {
        return ['id' => $id, 'label' => $label, 'weight' => $peso, 'sub' => $sub, 'pass' => $pasa, 'detail' => $detalle, 'hint' => $pista];
    }

    private function reglaMargen(array $m): array
    {
        if (! $m['disponible']) {
            $motivo = [
                'supuestos_no_cargados' => 'No cargaste tus supuestos de margen',
                'sin_precio' => 'No hay cotización del cultivo',
                'sin_cultivo' => 'El silo no tiene cultivo asignado',
            ][$m['motivo']] ?? 'Sin datos';

            return $this->regla('margen', 'Margen neto por ha', 25, 'mercado', false, $motivo, 'Cargá los supuestos con PUT /supuestos-margen/{tipo_cultivo_id}.');
        }

        $pasa = $m['margen_usd_ha'] > 0;

        return $this->regla(
            'margen',
            'Margen neto por ha',
            25,
            'mercado',
            $pasa,
            sprintf('USD %d/ha a USD %d/tn', (int) round($m['margen_usd_ha']), (int) round($m['precio']['precio_usd_tn'])),
            $pasa ? 'El margen cubre los costos.' : 'Con este precio el margen es negativo.'
        );
    }

    private function reglaTendencia(array $t): array
    {
        if ($t['puntos'] < 3) {
            return $this->regla('tendencia_precio', 'Tendencia del precio', 25, 'mercado', false, "Datos insuficientes ({$t['puntos']} días)", 'Hacen falta al menos 3 días de cotizaciones.');
        }

        $pasa = $t['actual'] > $t['promedio'];

        return $this->regla(
            'tendencia_precio',
            'Tendencia del precio',
            25,
            'mercado',
            $pasa,
            sprintf('USD %.2f hoy vs USD %.2f de promedio en 30 días', $t['actual'], $t['promedio']),
            $pasa ? 'El precio está por encima de su promedio.' : 'El precio está por debajo de su promedio: conviene esperar.'
        );
    }

    private function reglaHumedad(?float $h): array
    {
        $max = (float) config('agrotech.humedad_grano_max');

        if ($h === null) {
            return $this->regla('humedad_grano', 'Humedad del grano', 20, 'calidad', false, 'Sin medición', 'Registrá una medición con PUT /silos/{id}/mediciones.');
        }

        $pasa = $h <= $max;

        return $this->regla(
            'humedad_grano',
            'Humedad del grano',
            20,
            'calidad',
            $pasa,
            sprintf('%.1f %% (máximo %.1f %%)', $h, $max),
            $pasa ? 'La humedad es apta para la entrega.' : 'Grano húmedo: puede tener descuentos o no ser recibido.'
        );
    }

    private function reglaTemperatura(?float $t, ?float $limite): array
    {
        $limite = $limite ?? 25.0;

        if ($t === null) {
            return $this->regla('temperatura_nucleo', 'Temperatura del núcleo', 15, 'almacenamiento', false, 'Sin medición', 'Registrá una medición con PUT /silos/{id}/mediciones.');
        }

        $pasa = $t <= $limite;

        return $this->regla(
            'temperatura_nucleo',
            'Temperatura del núcleo',
            15,
            'almacenamiento',
            $pasa,
            sprintf('%.1f °C (límite %.1f °C)', $t, $limite),
            $pasa ? 'Temperatura dentro del límite.' : 'El grano se está calentando: conviene vender o ventilar.'
        );
    }

    private function reglaStock(float $stock): array
    {
        $pasa = $stock > 0;

        return $this->regla(
            'stock_disponible',
            'Stock disponible',
            15,
            'almacenamiento',
            $pasa,
            sprintf('%.2f tn en el silo', $stock),
            $pasa ? 'Hay grano para vender.' : 'El silo está vacío.'
        );
    }
}
