<?php

namespace App\Eventos;

use Illuminate\Support\Str;

final class Evento
{
    public static function crear(string $tipo, array $datos, int $version = 1): array
    {
        return [
            'event_id' => (string) Str::uuid(),
            'tipo' => $tipo,
            'version' => $version,
            'ocurrido_en' => now()->toIso8601String(),
            'datos' => $datos,
        ];
    }
}
