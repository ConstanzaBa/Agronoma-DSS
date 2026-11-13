<?php

namespace App\Eventos;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class RabbitPublicador implements PublicadorEventos
{
    public function __construct(private AlertasHttpPublicador $respaldo) {}

    public function publicar(string $routingKey, array $evento): bool
    {
        try {
            $url = rtrim((string) config('rabbit.url'), '/')
                . '/api/exchanges/' . urlencode((string) config('rabbit.vhost')) . '/agrotech.eventos/publish';

            $r = Http::withBasicAuth((string) config('rabbit.user'), (string) config('rabbit.pass'))
                ->timeout(3)
                ->post($url, [
                    'properties' => ['delivery_mode' => 2],
                    'routing_key' => $routingKey,
                    'payload' => json_encode($evento),
                    'payload_encoding' => 'string',
                ]);

            if ($r->successful() && $r->json('routed') === true) {
                return true;
            }

            Log::warning('RabbitMQ no enrutó el evento', ['estado' => $r->status(), 'event_id' => $evento['event_id']]);
        } catch (\Throwable $e) {
            Log::warning('RabbitMQ falló; uso el respaldo HTTP', ['error' => $e->getMessage()]);
        }

        return $this->respaldo->publicar($routingKey, $evento);
    }
}
