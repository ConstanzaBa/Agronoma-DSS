<?php

namespace App\Servicios;

use App\Support\Respuesta;
use Illuminate\Http\Client\Response as RespuestaHttp;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class ClienteServicios
{
    public function existe(string $servicio): bool
    {
        return array_key_exists($servicio, config('servicios.servicios'));
    }

    public function base(string $servicio): string
    {
        return rtrim((string) config("servicios.servicios.$servicio.url"), '/');
    }

    public function url(string $servicio, string $ruta = ''): string
    {
        return $this->base($servicio) . '/api/v1/' . ltrim($ruta, '/');
    }

    public function timeout(string $servicio): int
    {
        return (int) config("servicios.servicios.$servicio.timeout", 3);
    }

    /** Se arman desde cero: nunca se copia una X-* que venga del cliente. */
    public function cabeceras(?array $identidad, ?string $idSolicitud): array
    {
        $cabeceras = [
            'X-Gateway-Secret' => config('servicios.secreto'),
            'X-Request-Id' => $idSolicitud,
            'Accept' => 'application/json',
        ];

        if ($identidad) {
            $cabeceras += [
                'X-Usuario-Id' => $identidad['usuario_id'] ?? null,
                'X-Usuario-Rol' => $identidad['rol'] ?? null,
                'X-Autenticable-Tipo' => $identidad['autenticable'] ?? null,
                'X-Autenticable-Id' => $identidad['autenticable_id'] ?? null,
            ];
        }

        return array_map(
            'strval',
            array_filter($cabeceras, fn($v) => $v !== null && $v !== '')
        );
    }

    /** Falla = un 5xx que no es un error controlado del servicio. */
    public static function esFallo(RespuestaHttp $r): bool
    {
        return $r->status() >= 500 && $r->json('codigo') === null;
    }

    public function reenviar(
        string $servicio,
        Request $request,
        string $ruta,
        ?array $identidad
    ): Response {
        $breaker = new CircuitBreaker($servicio);

        if (! $breaker->permitido()) {
            Log::warning('Circuito abierto: no se llama al servicio', [
                'servicio' => $servicio
            ]);

            return Respuesta::error(
                'servicio_no_disponible',
                "El servicio {$servicio} no está disponible",
                503
            );
        }

        $intentos = $request->isMethod('GET') ? 2 : 1;
        $causa = 'sin respuesta';

        for ($i = 1; $i <= $intentos; $i++) {
            try {
                $cabeceras = $this->cabeceras(
                    $identidad,
                    $request->attributes->get('id_solicitud')
                );

                // Reenviar el Bearer Token al servicio auth.
                if ($servicio === 'auth' && $request->bearerToken()) {
                    $cabeceras['Authorization'] =
                        'Bearer ' . $request->bearerToken();
                }

                $pedido = Http::withHeaders($cabeceras)
                    ->timeout($this->timeout($servicio));

                if ($request->getContent() !== '') {
                    $pedido = $pedido->withBody(
                        $request->getContent(),
                        (string) $request->header(
                            'Content-Type',
                            'application/json'
                        )
                    );
                }

                $r = $pedido->send(
                    $request->method(),
                    $this->url($servicio, $ruta),
                    ['query' => $request->query()]
                );

                if (! self::esFallo($r)) {
                    $breaker->exito();

                    return response($r->body(), $r->status())
                        ->header(
                            'Content-Type',
                            $r->header('Content-Type') ?: 'application/json'
                        );
                }

                $causa = 'HTTP ' . $r->status();
            } catch (\Throwable $e) {
                $causa = $e->getMessage();
            }

            Log::warning('Falló el pedido al servicio', [
                'servicio' => $servicio,
                'intento' => $i,
                'causa' => mb_substr($causa, 0, 200)
            ]);
        }

        $breaker->fallo();

        return Respuesta::error(
            'servicio_no_disponible',
            "El servicio {$servicio} no responde",
            503
        );
    }

    /**
     * Reenvía un flujo SSE a medida que llega, sin acumularlo.
     * Usa cURL directo porque el cliente HTTP de Laravel
     * espera la respuesta completa.
     */
    public function transmitir(
        string $servicio,
        Request $request,
        string $ruta,
        ?array $identidad
    ): Response {
        $breaker = new CircuitBreaker($servicio);

        if (! $breaker->permitido()) {
            Log::warning('Circuito abierto: no se abre el flujo', [
                'servicio' => $servicio
            ]);

            return Respuesta::error(
                'servicio_no_disponible',
                "El servicio {$servicio} no está disponible",
                503
            );
        }

        $cabeceras = $this->cabeceras(
            $identidad,
            $request->attributes->get('id_solicitud')
        );

        if ($ultimo = $request->header('Last-Event-ID')) {
            $cabeceras['Last-Event-ID'] = $ultimo;
        }

        $lineas = ['Accept: text/event-stream'];

        foreach ($cabeceras as $nombre => $valor) {
            $lineas[] = "$nombre: $valor";
        }

        $url = $this->url($servicio, $ruta)
            . ($request->getQueryString()
                ? '?' . $request->getQueryString()
                : '');

        return response()->stream(function () use (
            $url,
            $lineas,
            $breaker,
            $servicio
        ) {
            @set_time_limit(40);
            @ini_set('zlib.output_compression', '0');

            $ch = curl_init($url);

            curl_setopt_array($ch, [
                CURLOPT_HTTPHEADER => $lineas,
                CURLOPT_CONNECTTIMEOUT => 3,
                CURLOPT_TIMEOUT => 35,

                CURLOPT_WRITEFUNCTION => function ($ch, $trozo) {
                    echo $trozo;

                    if (ob_get_level() > 0) {
                        @ob_flush();
                    }

                    flush();

                    return strlen($trozo);
                },
            ]);

            curl_exec($ch);

            $estado = (int) curl_getinfo(
                $ch,
                CURLINFO_RESPONSE_CODE
            );

            curl_close($ch);

            if ($estado === 0) {
                $breaker->fallo();

                Log::error('No se pudo abrir el flujo SSE', [
                    'servicio' => $servicio
                ]);

                echo "event: error\ndata: {\"codigo\":\"servicio_no_disponible\",\"mensaje\":\"El servicio no responde\"}\n\n";

                flush();

                return;
            }

            $breaker->exito();
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'X-Accel-Buffering' => 'no',
        ]);
    }
}
