<?php

namespace App\Servicios;

use App\Eventos\Evento;
use App\Eventos\PublicadorEventos;
use App\Models\CotizacionGrano;
use App\Models\Divisa;

class Cotizaciones
{
    public function __construct(private PublicadorEventos $publicador) {}

    public function guardar(int $cultivoId, string $fecha, float $usd, string $referencia, string $fuente, ?int $creadoPor = null): CotizacionGrano
    {
        $dolar = $this->dolar($fecha);

        return CotizacionGrano::updateOrCreate(
            ['tipo_cultivo_id' => $cultivoId, 'fecha_cotizacion' => $fecha, 'fuente' => $fuente],
            [
                'precio_usd_tn' => $usd,
                'precio_ars_tn' => $dolar ? round($usd * $dolar->valor_ars_usd, 2) : null,
                'mercado_referencia' => $referencia,
                'creado_por' => $creadoPor,
            ]
        );
    }

    /** Prioridad de fuentes del mismo día: manual, webhook, api. */
    public function ultima(int $cultivoId): ?CotizacionGrano
    {
        return CotizacionGrano::where('tipo_cultivo_id', $cultivoId)
            ->orderByDesc('fecha_cotizacion')
            ->orderByRaw("FIELD(fuente, 'manual', 'webhook', 'api')")
            ->first();
    }

    public function dolar(string $fecha, ?string $tipo = null): ?Divisa
    {
        return Divisa::where('tipo', $tipo ?? config('agrotech.dolar_pesificacion'))
            ->where('fecha', '<=', $fecha)
            ->orderByDesc('fecha')
            ->orderByRaw("FIELD(fuente, 'manual', 'api')")
            ->first();
    }

    public function esAntigua(CotizacionGrano $c): bool
    {
        return $c->fecha_cotizacion->toDateString() < now()->toDateString();
    }

    /** Precio actual contra el promedio de los últimos 30 días (un valor por día). */
    public function tendencia(int $cultivoId): array
    {
        $filas = CotizacionGrano::where('tipo_cultivo_id', $cultivoId)
            ->where('fecha_cotizacion', '>=', now()->subDays(30)->toDateString())
            ->orderBy('fecha_cotizacion')
            ->orderByRaw("FIELD(fuente, 'manual', 'webhook', 'api') DESC")
            ->get();

        $porDia = [];

        foreach ($filas as $f) {
            $porDia[$f->fecha_cotizacion->toDateString()] = $f->precio_usd_tn;   // gana la fuente de mayor prioridad
        }

        $puntos = count($porDia);

        return [
            'puntos' => $puntos,
            'actual' => $puntos ? end($porDia) : null,
            'promedio' => $puntos ? round(array_sum($porDia) / $puntos, 2) : null,
        ];
    }

    public function publicar(CotizacionGrano $c): void
    {
        $this->publicador->publicar('cotizacion.actualizada', Evento::crear('cotizacion_actualizada', [
            'tipo_cultivo_id' => $c->tipo_cultivo_id,
            'fecha' => $c->fecha_cotizacion->toDateString(),
            'precio_usd_tn' => $c->precio_usd_tn,
            'precio_ars_tn' => $c->precio_ars_tn,
            'fuente' => $c->fuente,
            'desactualizada' => $this->esAntigua($c),
        ]));
    }
}
