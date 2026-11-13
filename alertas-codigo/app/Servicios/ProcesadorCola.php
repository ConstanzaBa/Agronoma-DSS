<?php

namespace App\Servicios;

use App\Excepciones\EventoInvalido;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class ProcesadorCola
{
    public function __construct(private ManejadorEventos $manejador) {}

    /** @return array{omitido:bool,desde_rabbit:int,pendientes:int} */
    public function drenar(int $maxSegundos = 20): array
    {
        $lock = Cache::lock('evaluador-alertas', 55);

        if (! $lock->get()) {
            Log::info('Otro pedido está procesando la cola: no se duplica el trabajo');

            return ['omitido' => true, 'desde_rabbit' => 0, 'pendientes' => $this->pendientes()];
        }

        $desdeRabbit = 0;

        try {
            if (config('agrotech.cola_driver') === 'rabbitmq') {
                $desdeRabbit = $this->tomarDeRabbit();
            }

            Artisan::call('queue:work', [
                '--queue' => 'alertas.eventos,alertas.correos',
                '--stop-when-empty' => true,
                '--max-time' => $maxSegundos,
                '--sleep' => 0,
            ]);
        } catch (\Throwable $e) {
            Log::error('Falló el procesamiento de la cola', ['error' => $e->getMessage()]);
        } finally {
            $lock->release();
        }

        return ['omitido' => false, 'desde_rabbit' => $desdeRabbit, 'pendientes' => $this->pendientes()];
    }

    public function pendientes(): int
    {
        return DB::table('jobs')->count();
    }

    /** Consume `alertas.eventos` por la API HTTP de CloudAMQP (sin probar: necesita una cuenta). */
    private function tomarDeRabbit(): int
    {
        $base = rtrim((string) config('rabbit.url'), '/') . '/api';
        $vhost = urlencode((string) config('rabbit.vhost'));
        $procesados = 0;

        try {
            $r = Http::withBasicAuth((string) config('rabbit.user'), (string) config('rabbit.pass'))
                ->timeout(3)
                ->post("$base/queues/$vhost/alertas.eventos/get", [
                    'count' => 20,
                    'ackmode' => 'ack_requeue_false',
                    'encoding' => 'auto',
                ]);

            if (! $r->successful()) {
                Log::warning('RabbitMQ no entregó mensajes', ['estado' => $r->status()]);

                return 0;
            }
        } catch (\Throwable $e) {
            Log::warning('RabbitMQ no responde: se sigue con lo que haya en la base', ['error' => $e->getMessage()]);

            return 0;
        }

        foreach ($r->json() ?? [] as $mensaje) {
            $payload = (string) ($mensaje['payload'] ?? '');
            $evento = json_decode($payload, true);

            try {
                if (! is_array($evento)) {
                    throw new EventoInvalido(['payload' => ['No es un JSON válido']]);
                }

                $this->manejador->manejar($evento);
                $procesados++;
            } catch (EventoInvalido $e) {
                Log::warning('Evento inválido de RabbitMQ: va a failed_jobs', ['errores' => $e->errores]);
                app('queue.failer')->log('rabbitmq', 'alertas.eventos', json_encode([
                    'uuid' => (string) Str::uuid(),
                    'displayName' => 'EventoInvalidoDeRabbitMQ',
                    'data' => ['evento' => $payload],
                ]), $e);
            } catch (\Throwable $e) {
                Log::error('Falló un evento de RabbitMQ: se republica', ['error' => $e->getMessage()]);
                $this->republicar($base, $vhost, $payload);
            }
        }

        return $procesados;
    }

    private function republicar(string $base, string $vhost, string $payload): void
    {
        try {
            Http::withBasicAuth((string) config('rabbit.user'), (string) config('rabbit.pass'))
                ->timeout(3)
                ->post("$base/exchanges/$vhost/amq.default/publish", [
                    'properties' => ['delivery_mode' => 2],
                    'routing_key' => 'alertas.eventos',
                    'payload' => $payload,
                    'payload_encoding' => 'string',
                ]);
        } catch (\Throwable $e) {
            Log::error('No se pudo republicar el evento: se pierde', ['error' => $e->getMessage()]);
        }
    }
}
