<?php

namespace App\Servicios;

use App\Eventos\Evento;
use App\Eventos\PublicadorEventos;
use App\Models\Dispositivo;
use App\Models\Lectura;
use App\Models\Lote;
use App\Models\RegistroLluvia;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

class RecepcionLecturas
{
    public function __construct(private PublicadorEventos $publicador) {}

    /** @return array{0:int,1:array} estado HTTP y cuerpo */
    public function recibir(Dispositivo $d, array $datos): array
    {
        if (! $d->activo) {
            return [403, ['codigo' => 'sin_permiso', 'mensaje' => 'Dispositivo inexistente o inactivo']];
        }

        $secuencia = (int) $datos['secuencia'];
        $medido = Carbon::parse($datos['medido_en'])->utc();

        try {
            $lectura = Lectura::create([
                'dispositivo_id' => $d->id,
                'lote_id' => $d->lote_id,
                'secuencia' => $secuencia,
                'humedad_suelo_pct' => $datos['humedad_suelo_pct'],
                'humedad_aire_pct' => $datos['humedad_aire_pct'],
                'temperatura_c' => $datos['temperatura_c'],
                'precipitacion_mm' => $datos['precipitacion_mm'] ?? null,
                'medido_en' => $medido,
                'recibido_en' => now(),
            ]);
        } catch (UniqueConstraintViolationException $e) {
            $previa = Lectura::where('dispositivo_id', $d->id)->where('secuencia', $secuencia)->first();
            $distinta = $previa && (
                abs($previa->humedad_suelo_pct - (float) $datos['humedad_suelo_pct']) > 0.001
                || ! $previa->medido_en->equalTo($medido)
            );

            if ($distinta) {
                Log::warning('Secuencia repetida con datos distintos', ['dispositivo_id' => $d->id, 'secuencia' => $secuencia]);

                return [409, ['codigo' => 'secuencia_conflicto', 'mensaje' => 'Esa secuencia ya existe con otros datos']];
            }

            Log::info('Lectura duplicada ignorada', ['dispositivo_id' => $d->id, 'secuencia' => $secuencia]);

            return [200, ['duplicada' => true, 'secuencia' => $secuencia]];
        }

        $esNueva = Dispositivo::where('id', $d->id)
            ->where('ultima_secuencia', '<', $secuencia)
            ->update(['ultima_secuencia' => $secuencia, 'ultima_conexion_en' => now()]) === 1;

        if ($esNueva) {
            Lote::where('id', $d->lote_id)->update([
                'ultima_humedad_suelo_pct' => $datos['humedad_suelo_pct'],
                'estado' => $this->estado((float) $datos['humedad_suelo_pct']),
            ]);
        } else {
            Dispositivo::where('id', $d->id)->update(['ultima_conexion_en' => now()]);
            Log::info('Lectura vieja guardada sin tocar el caché', ['dispositivo_id' => $d->id, 'secuencia' => $secuencia]);
        }

        // Cuenta y estancia salen de la jerarquía propia de Campo (dispositivo → lote → establecimiento),
        // nunca del pedido del sensor.
        $establecimiento = $d->lote->establecimiento;

        $this->publicador->publicar('lectura.recibida', Evento::crear('lectura_recibida', [
            'lote_id' => $d->lote_id,
            'dispositivo_id' => $d->id,
            'cuenta_id' => $establecimiento?->cuenta_id,
            'establecimiento_id' => $d->lote->establecimiento_id,
            'usuario_id' => $establecimiento?->cuenta?->administrador_usuario_id,
            'humedad_suelo_pct' => (float) $datos['humedad_suelo_pct'],
            'dias_sin_lluvia' => $this->diasSinLluvia($d->lote_id),
            'medido_en' => $medido->toIso8601String(),
        ]));

        return [201, ['id' => $lectura->id, 'duplicada' => false, 'actualiza_cache' => $esNueva]];
    }

    private function estado(float $humedad): string
    {
        if ($humedad < config('agrotech.humedad_critica')) {
            return 'critical';
        }

        return $humedad < config('agrotech.humedad_advertencia') ? 'warning' : 'optimal';
    }

    private function diasSinLluvia(int $loteId): ?int
    {
        $ultima = RegistroLluvia::where('lote_id', $loteId)->where('milimetros', '>', 0)->max('fecha_registro');

        return $ultima ? (int) Carbon::parse($ultima)->startOfDay()->diffInDays(now()->startOfDay()) : null;
    }
}
