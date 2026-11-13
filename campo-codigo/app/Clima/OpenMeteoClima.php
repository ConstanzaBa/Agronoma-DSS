<?php

namespace App\Clima;

use Illuminate\Support\Facades\Http;

class OpenMeteoClima implements ProveedorClima
{
    public function obtener(float $latitud, float $longitud): array
    {
        $r = Http::timeout(3)->get('https://api.open-meteo.com/v1/forecast', [
            'latitude' => $latitud,
            'longitude' => $longitud,
            'current' => 'temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m',
            'daily' => 'temperature_2m_max,temperature_2m_min,precipitation_sum',
            'forecast_days' => 5,
            'timezone' => 'auto',
        ]);

        if (! $r->successful() || ! $r->json('current')) {
            throw new \RuntimeException('Open-Meteo respondió ' . $r->status());
        }

        $actual = $r->json('current');
        $diario = $r->json('daily') ?? [];
        $pronostico = [];

        foreach (($diario['time'] ?? []) as $i => $dia) {
            $pronostico[] = [
                'fecha' => $dia,
                'tmax' => $diario['temperature_2m_max'][$i] ?? null,
                'tmin' => $diario['temperature_2m_min'][$i] ?? null,
                'lluvia_mm' => $diario['precipitation_sum'][$i] ?? null,
            ];
        }

        return [
            'temperatura_c' => $actual['temperature_2m'] ?? null,
            'humedad_pct' => $actual['relative_humidity_2m'] ?? null,
            'precipitacion_mm' => $actual['precipitation'] ?? null,
            'viento_kmh' => $actual['wind_speed_10m'] ?? null,
            'pronostico' => $pronostico,
            'fuente' => 'open-meteo',
        ];
    }
}
