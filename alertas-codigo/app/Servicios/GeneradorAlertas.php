<?php

namespace App\Servicios;

use App\Models\Alerta;
use App\Models\ObjetivoPrecio;
use App\Models\ReglaAlerta;
use Illuminate\Support\Facades\Log;

class GeneradorAlertas
{
    private const PESO = ['critical' => 3, 'warning' => 2, 'info' => 1];

    /** @return Alerta[] las alertas creadas o escaladas por este evento */
    public function desdeEvento(array $evento): array
    {
        $d = $evento['datos'];

        return match ($evento['tipo']) {
            'lectura_recibida' => array_merge($this->humedad($d), $this->sinLluvia($d)),
            'silo_temperatura' => $this->temperaturaSilo($d),
            'indice_venta_calculado' => $this->mercado($d),
            'cotizacion_actualizada' => $this->precioObjetivo($d),
            default => [],
        };
    }

    private function humedad(array $d): array
    {
        $humedad = (float) $d['humedad_suelo_pct'];

        foreach ($this->reglas('moisture') as $regla) {
            $umbral = (float) ($regla->parametros['umbral_menor_pct'] ?? 0);

            if ($humedad < $umbral) {
                $titulo = $regla->severidad === 'critical'
                    ? "Humedad crítica en el lote #{$d['lote_id']}"
                    : "Humedad baja en el lote #{$d['lote_id']}";

                $alerta = $this->emitir(
                    (int) $d['usuario_id'],
                    $this->cuenta($d),
                    $this->estancia($d),
                    $regla,
                    ['lote_id' => (int) $d['lote_id']],
                    $titulo,
                    sprintf('La humedad del suelo es %.1f %% (umbral: menos de %.1f %%).', $humedad, $umbral),
                    ['humedad_suelo_pct' => $humedad, 'umbral' => $umbral, 'medido_en' => $d['medido_en']]
                );

                return $alerta ? [$alerta] : [];   // solo la regla más grave que se cumple
            }
        }

        return [];
    }

    private function sinLluvia(array $d): array
    {
        $dias = $d['dias_sin_lluvia'] ?? null;

        if ($dias === null) {
            return [];
        }

        foreach ($this->reglas('no_rain') as $regla) {
            $minimo = (int) ($regla->parametros['dias_minimos'] ?? 15);

            if ($dias >= $minimo) {
                $alerta = $this->emitir(
                    (int) $d['usuario_id'],
                    $this->cuenta($d),
                    $this->estancia($d),
                    $regla,
                    ['lote_id' => (int) $d['lote_id']],
                    "Sin lluvia hace {$dias} días en el lote #{$d['lote_id']}",
                    "El lote #{$d['lote_id']} lleva {$dias} días sin lluvia registrada (aviso desde los {$minimo} días).",
                    ['dias_sin_lluvia' => $dias, 'dias_minimos' => $minimo]
                );

                return $alerta ? [$alerta] : [];
            }
        }

        return [];
    }

    private function temperaturaSilo(array $d): array
    {
        $temperatura = (float) $d['temperatura_nucleo_c'];
        $limite = (float) $d['temperatura_limite_c'];

        foreach ($this->reglas('silo_temp') as $regla) {
            $margen = (float) ($regla->parametros['margen_c'] ?? 0);

            if ($temperatura > $limite + $margen) {
                $titulo = $regla->severidad === 'critical'
                    ? "Temperatura crítica en el silo #{$d['silo_id']}"
                    : "Temperatura alta en el silo #{$d['silo_id']}";

                $alerta = $this->emitir(
                    (int) $d['usuario_id'],
                    $this->cuenta($d),
                    $this->estancia($d),
                    $regla,
                    ['silo_id' => (int) $d['silo_id']],
                    $titulo,
                    sprintf('El núcleo del silo está a %.1f °C (límite: %.1f °C).', $temperatura, $limite),
                    ['temperatura_nucleo_c' => $temperatura, 'temperatura_limite_c' => $limite]
                );

                return $alerta ? [$alerta] : [];
            }
        }

        return [];
    }

    private function mercado(array $d): array
    {
        foreach ($this->reglas('market') as $regla) {
            if (in_array($d['veredicto'], $regla->parametros['veredictos'] ?? ['sell'], true)) {
                $alerta = $this->emitir(
                    (int) $d['usuario_id'],
                    $this->cuenta($d),
                    $this->estancia($d),
                    $regla,
                    ['silo_id' => (int) $d['silo_id']],
                    "Buen momento para vender (silo #{$d['silo_id']})",
                    "El índice de venta del silo #{$d['silo_id']} es {$d['puntaje']}/100 y el veredicto es vender.",
                    ['puntaje' => (int) $d['puntaje'], 'veredicto' => $d['veredicto']]
                );

                return $alerta ? [$alerta] : [];
            }
        }

        return [];
    }

    private function precioObjetivo(array $d): array
    {
        if (! empty($d['desactualizada'])) {
            Log::info('Cotización desactualizada: no se evalúan objetivos de precio', ['tipo_cultivo_id' => $d['tipo_cultivo_id']]);

            return [];
        }

        $regla = ReglaAlerta::where('tipo', 'price_target')->where('activa', true)->first();

        if (! $regla) {
            return [];
        }

        $horas = (int) ($regla->parametros['enfriamiento_horas'] ?? 24);
        $cultivoId = (int) $d['tipo_cultivo_id'];
        $cultivo = config("agrotech.cultivos.$cultivoId", "cultivo #$cultivoId");
        $formato = fn(float $n) => number_format($n, 2, ',', '.');
        $alertas = [];

        foreach (ObjetivoPrecio::where('tipo_cultivo_id', $cultivoId)->where('activo', true)->get() as $objetivo) {
            $precio = $objetivo->moneda === 'ARS' ? ($d['precio_ars_tn'] ?? null) : $d['precio_usd_tn'];

            if ($precio === null) {
                continue;
            }

            $precio = (float) $precio;
            $cumple = $objetivo->direccion === 'sube' ? $precio >= $objetivo->umbral : $precio <= $objetivo->umbral;

            if (! $cumple) {
                continue;
            }

            if ($objetivo->ultimo_disparo_en && $objetivo->ultimo_disparo_en->gt(now()->subHours($horas))) {
                Log::info('Objetivo en enfriamiento: no se avisa', ['objetivo_id' => $objetivo->id]);

                continue;
            }

            $verbo = $objetivo->direccion === 'sube' ? 'superó' : 'cayó por debajo de';
            $alerta = $this->emitir(
                $objetivo->usuario_id,
                $objetivo->cuenta_id,
                null,
                $regla,
                ['datos->tipo_cultivo_id' => $cultivoId],
                "La {$cultivo} {$verbo} {$objetivo->moneda} {$formato($objetivo->umbral)}",
                "El precio llegó a {$objetivo->moneda} {$formato($precio)} por tonelada (tu objetivo: {$objetivo->moneda} {$formato($objetivo->umbral)}).",
                ['tipo_cultivo_id' => $cultivoId, 'objetivo_id' => $objetivo->id, 'precio' => $precio, 'moneda' => $objetivo->moneda]
            );

            $objetivo->update(['ultimo_disparo_en' => now()]);

            if ($alerta) {
                $alertas[] = $alerta;
            }
        }

        return $alertas;
    }

    /** Cuenta y estancia vienen en el evento (emitido por un servicio interno), no del cliente. */
    private function cuenta(array $d): ?int
    {
        return isset($d['cuenta_id']) ? (int) $d['cuenta_id'] : null;
    }

    private function estancia(array $d): ?int
    {
        return isset($d['establecimiento_id']) ? (int) $d['establecimiento_id'] : null;
    }

    /** Reglas activas de un tipo, de la más grave a la más leve. */
    private function reglas(string $tipo)
    {
        return ReglaAlerta::where('tipo', $tipo)->where('activa', true)->get()
            ->sortByDesc(fn($r) => self::PESO[$r->severidad] ?? 0)
            ->values();
    }

    /**
     * Crea la alerta, salvo que ya haya una activa del mismo tipo y entidad (tu paso 4).
     * Si la nueva es más grave, la existente sube de severidad.
     */
    private function emitir(int $usuarioId, ?int $cuentaId, ?int $estanciaId, ReglaAlerta $regla, array $clave, string $titulo, string $mensaje, array $datos): ?Alerta
    {
        $consulta = Alerta::where('tipo', $regla->tipo)->where('estado', 'active');

        // Sin cuenta en el evento (emisor aún no adaptado) se conserva el criterio anterior por usuario.
        $cuentaId !== null
            ? $consulta->where('cuenta_id', $cuentaId)
            : $consulta->whereNull('cuenta_id')->where('usuario_id', $usuarioId);

        foreach ($clave as $columna => $valor) {
            $consulta->where($columna, $valor);
        }

        $existente = $consulta->first();

        if ($existente) {
            if ((self::PESO[$regla->severidad] ?? 0) > (self::PESO[$existente->severidad] ?? 0)) {
                $existente->update([
                    'regla_id' => $regla->id,
                    'severidad' => $regla->severidad,
                    'titulo' => $titulo,
                    'mensaje' => $mensaje,
                    'datos' => $datos,
                ]);
                Log::info('Alerta escalada', ['alerta_id' => $existente->id, 'severidad' => $regla->severidad]);

                return $existente;
            }

            Log::info('Ya hay una alerta activa del mismo tipo: no se duplica', ['alerta_id' => $existente->id]);

            return null;
        }

        $alerta = Alerta::create([
            'cuenta_id' => $cuentaId,
            'establecimiento_id' => $estanciaId,
            'usuario_id' => $usuarioId,
            'regla_id' => $regla->id,
            'tipo' => $regla->tipo,
            'severidad' => $regla->severidad,
            'lote_id' => $clave['lote_id'] ?? null,
            'silo_id' => $clave['silo_id'] ?? null,
            'titulo' => mb_substr($titulo, 0, 120),
            'mensaje' => $mensaje,
            'datos' => $datos,
            'estado' => 'active',
            'activada_en' => now(),
        ]);
        Log::info('Alerta creada', ['alerta_id' => $alerta->id, 'tipo' => $alerta->tipo, 'severidad' => $alerta->severidad]);

        return $alerta;
    }
}
