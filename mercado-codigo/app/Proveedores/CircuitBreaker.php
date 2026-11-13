<?php

namespace App\Proveedores;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class CircuitBreaker
{
    public function __construct(
        private string $nombre,
        private int $umbral = 3,
        private int $segundosAbierto = 60,
    ) {}

    /** @template T @param callable():T $accion @return T */
    public function ejecutar(callable $accion)
    {
        if (Cache::has($this->clave('abierto'))) {
            throw new \RuntimeException("Circuito abierto: {$this->nombre}");
        }

        try {
            $resultado = $accion();
            Cache::forget($this->clave('fallos'));

            return $resultado;
        } catch (\Throwable $e) {
            $fallos = (int) Cache::get($this->clave('fallos'), 0) + 1;
            Cache::put($this->clave('fallos'), $fallos, now()->addMinutes(5));

            if ($fallos >= $this->umbral) {
                Cache::put($this->clave('abierto'), true, now()->addSeconds($this->segundosAbierto));
                Cache::forget($this->clave('fallos'));
                Log::warning('Circuit breaker abierto', ['servicio' => $this->nombre, 'segundos' => $this->segundosAbierto]);
            }

            throw $e;
        }
    }

    private function clave(string $parte): string
    {
        return "cb:{$this->nombre}:{$parte}";
    }
}
