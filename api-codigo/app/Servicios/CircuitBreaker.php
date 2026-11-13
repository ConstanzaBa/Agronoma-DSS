<?php

namespace App\Servicios;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class CircuitBreaker
{
    public function __construct(private string $servicio) {}

    /** cerrado | abierto | semiabierto */
    public function estado(): string
    {
        $hasta = Cache::get($this->clave('abierto_hasta'));

        if ($hasta === null) {
            return 'cerrado';
        }

        return time() < $hasta ? 'abierto' : 'semiabierto';
    }

    public function permitido(): bool
    {
        return match ($this->estado()) {
            'cerrado' => true,
            'abierto' => false,
            'semiabierto' => Cache::add($this->clave('prueba'), 1, 10),   // solo pasa una llamada de prueba
        };
    }

    public function exito(): void
    {
        if ($this->estado() !== 'cerrado') {
            Log::info('Circuit breaker cerrado', ['servicio' => $this->servicio]);
        }

        Cache::forget($this->clave('abierto_hasta'));
        Cache::forget($this->clave('fallos'));
        Cache::forget($this->clave('prueba'));
    }

    public function fallo(): void
    {
        if ($this->estado() === 'semiabierto') {
            $this->abrir();

            return;
        }

        $fallos = (int) Cache::get($this->clave('fallos'), 0) + 1;
        Cache::put($this->clave('fallos'), $fallos, now()->addMinutes(5));

        if ($fallos >= (int) config('servicios.breaker.umbral')) {
            $this->abrir();
        }
    }

    private function abrir(): void
    {
        $segundos = (int) config('servicios.breaker.segundos_abierto');
        Cache::put($this->clave('abierto_hasta'), time() + $segundos, now()->addMinutes(10));
        Cache::forget($this->clave('fallos'));
        Cache::forget($this->clave('prueba'));
        Log::warning('Circuit breaker abierto', ['servicio' => $this->servicio, 'segundos' => $segundos]);
    }

    private function clave(string $parte): string
    {
        return "cb:{$this->servicio}:{$parte}";
    }
}
