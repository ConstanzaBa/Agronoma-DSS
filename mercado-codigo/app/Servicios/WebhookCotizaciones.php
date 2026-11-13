<?php

namespace App\Servicios;

use App\Models\WebhookRecibido;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class WebhookCotizaciones
{
    public function __construct(private Cotizaciones $cotizaciones) {}

    /** @return array{0:int,1:array} estado HTTP y cuerpo */
    public function procesar(string $cuerpo, ?string $firma): array
    {
        // 1) Firma sobre el cuerpo crudo, antes de mirar nada más.
        $secreto = (string) config('agrotech.webhook_secret');
        $esperada = hash_hmac('sha256', $cuerpo, $secreto);

        if ($secreto === '' || ! $firma || ! hash_equals($esperada, strtolower(trim($firma)))) {
            Log::warning('Webhook rechazado: firma inválida');

            return [401, ['codigo' => 'firma_invalida', 'mensaje' => 'La firma no coincide']];
        }

        $datos = json_decode($cuerpo, true);
        $validador = Validator::make(is_array($datos) ? $datos : [], [
            'event_id' => 'required|string|max:64',
            'proveedor' => 'required|string|max:40',
            'datos.tipo_cultivo_id' => 'required|integer|min:1',
            'datos.fecha' => 'required|date_format:Y-m-d',
            'datos.precio_usd_tn' => 'required|numeric|gt:0',
            'datos.mercado_referencia' => 'required|in:CBOT,ROSARIO',
        ]);

        if ($validador->fails()) {
            Log::warning('Webhook con cuerpo inválido', ['errores' => $validador->errors()->keys()]);

            return [422, ['codigo' => 'validacion', 'mensaje' => 'Datos inválidos', 'detalles' => $validador->errors()->toArray()]];
        }

        // 2) event_id único: si ya está procesado, se responde 200 sin reprocesar.
        try {
            $registro = WebhookRecibido::create([
                'event_id' => $datos['event_id'],
                'proveedor' => $datos['proveedor'],
                'payload' => $datos,
                'procesado' => false,
                'recibido_en' => now(),
            ]);
        } catch (UniqueConstraintViolationException $e) {
            $registro = WebhookRecibido::where('event_id', $datos['event_id'])->first();

            if ($registro->procesado) {
                Log::info('Webhook repetido ignorado', ['event_id' => $datos['event_id']]);

                return [200, ['recibido' => true, 'duplicado' => true]];
            }

            Log::info('Webhook repetido que había quedado sin procesar: se reintenta', ['event_id' => $datos['event_id']]);
        }

        // 3) Guardar la cotización y marcarlo procesado.
        $d = $datos['datos'];
        $c = $this->cotizaciones->guardar((int) $d['tipo_cultivo_id'], $d['fecha'], (float) $d['precio_usd_tn'], $d['mercado_referencia'], 'webhook');
        $this->cotizaciones->publicar($c);
        $registro->update(['procesado' => true]);

        Log::info('Webhook procesado', ['event_id' => $datos['event_id'], 'cotizacion_id' => $c->id]);

        return [200, ['recibido' => true, 'duplicado' => false]];
    }
}
