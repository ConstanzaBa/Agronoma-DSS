<?php

namespace App\Servicios;

use App\Jobs\EnviarCorreoAlerta;
use App\Models\Alerta;
use App\Models\EventoProcesado;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ManejadorEventos
{
    public function __construct(private ValidadorEventos $validador, private GeneradorAlertas $generador) {}

    /** @throws \App\Excepciones\EventoInvalido */
    public function manejar(array $evento): void
    {
        $this->validador->validar($evento);

        $alertas = DB::transaction(function () use ($evento) {
            try {
                EventoProcesado::create([
                    'event_id' => $evento['event_id'],
                    'tipo' => $evento['tipo'],
                    'procesado_en' => now(),
                ]);
            } catch (UniqueConstraintViolationException $e) {
                Log::info('Evento duplicado descartado', ['event_id' => $evento['event_id']]);

                return null;
            }

            return $this->generador->desdeEvento($evento);
        });

        foreach ($alertas ?? [] as $alerta) {
            $this->avisarPorCorreo($alerta);
        }
    }

    private function avisarPorCorreo(Alerta $alerta): void
    {
        if (! config('agrotech.correo_activo') || ! in_array($alerta->severidad, config('agrotech.correo_severidades'), true)) {
            return;
        }

        EnviarCorreoAlerta::dispatch($alerta->id, $alerta->usuario_id, $alerta->titulo)->onQueue('alertas.correos');
        Log::info('Comando EnviarCorreoAlerta encolado', ['alerta_id' => $alerta->id]);
    }
}
