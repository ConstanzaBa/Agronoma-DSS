<?php

namespace App\Servicios;

use App\Excepciones\EventoInvalido;
use Illuminate\Support\Facades\Validator;

class ValidadorEventos
{
    private const SOBRE = [
        'event_id' => 'required|string|size:36',
        'tipo' => 'required|string',
        'version' => 'required|integer|in:1',
        'ocurrido_en' => 'required|date',
        'datos' => 'required|array',
    ];

    private const DATOS = [
        'lectura_recibida' => [
            'datos.lote_id' => 'required|integer|min:1',
            'datos.dispositivo_id' => 'required|integer|min:1',
            'datos.usuario_id' => 'required|integer|min:1',
            'datos.humedad_suelo_pct' => 'required|numeric|between:0,100',
            'datos.dias_sin_lluvia' => 'nullable|integer|min:0',
            'datos.medido_en' => 'required|date',
        ],
        'silo_temperatura' => [
            'datos.silo_id' => 'required|integer|min:1',
            'datos.usuario_id' => 'required|integer|min:1',
            'datos.temperatura_nucleo_c' => 'required|numeric',
            'datos.temperatura_limite_c' => 'required|numeric',
        ],
        'indice_venta_calculado' => [
            'datos.silo_id' => 'required|integer|min:1',
            'datos.usuario_id' => 'required|integer|min:1',
            'datos.puntaje' => 'required|integer|between:0,100',
            'datos.veredicto' => 'required|in:sell,review,wait',
        ],
        'cotizacion_actualizada' => [
            'datos.tipo_cultivo_id' => 'required|integer|min:1',
            'datos.fecha' => 'required|date_format:Y-m-d',
            'datos.precio_usd_tn' => 'required|numeric|gt:0',
            'datos.precio_ars_tn' => 'nullable|numeric|gt:0',
            'datos.fuente' => 'required|string',
            'datos.desactualizada' => 'nullable|boolean',
        ],
    ];

    /** @throws EventoInvalido */
    public function validar(array $evento): void
    {
        $sobre = Validator::make($evento, self::SOBRE);

        if ($sobre->fails()) {
            throw new EventoInvalido($sobre->errors()->toArray());
        }

        $reglas = self::DATOS[$evento['tipo']] ?? null;

        if ($reglas === null) {
            throw new EventoInvalido(['tipo' => ["Tipo de evento desconocido: {$evento['tipo']}"]]);
        }

        $datos = Validator::make($evento, $reglas);

        if ($datos->fails()) {
            throw new EventoInvalido($datos->errors()->toArray());
        }
    }
}
