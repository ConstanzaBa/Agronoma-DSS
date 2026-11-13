<?php

namespace App\Jobs;

use App\Excepciones\EventoInvalido;
use App\Servicios\ManejadorEventos;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;

class ProcesarEvento implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable;

    public $tries = 3;
    public $backoff = [10, 60, 300];

    public function __construct(public array $evento) {}

    public function handle(ManejadorEventos $manejador): void
    {
        try {
            $manejador->manejar($this->evento);
        } catch (EventoInvalido $e) {
            Log::warning('Evento inválido: va a failed_jobs (cola de eventos muertos)', ['errores' => $e->errores]);
            $this->fail($e);
        }
    }
}
