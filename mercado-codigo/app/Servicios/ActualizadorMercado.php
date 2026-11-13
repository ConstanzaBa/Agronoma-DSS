<?php

namespace App\Servicios;

use App\Models\CotizacionGrano;
use App\Models\Divisa;
use App\Models\RegistroActualizacion;
use App\Proveedores\CircuitBreaker;
use App\Proveedores\ProveedorDivisas;
use App\Proveedores\ProveedorPrecios;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class ActualizadorMercado
{
    private const ENFRIAMIENTO_MINUTOS = 30;

    public function __construct(
        private ProveedorPrecios $precios,
        private ProveedorDivisas $divisas,
        private Cotizaciones $cotizaciones,
    ) {}

    public function asegurarHoy(bool $forzar = false): void
    {
        $hoy = now()->toDateString();

        if (! $forzar && ! $this->faltaAlgo($hoy)) {
            return;
        }

        $lock = Cache::lock('actualizar-precios', 30);

        if (! $lock->get()) {
            Log::info('Otro pedido está actualizando precios; sirvo el último dato');

            return;
        }

        try {
            $this->actualizarDivisas($forzar);   // primero el dólar, para pesificar bien
            $this->actualizarGranos($hoy, $forzar);
        } finally {
            $lock->release();
        }
    }

    private function faltaAlgo(string $hoy): bool
    {
        $granos = CotizacionGrano::where('fecha_cotizacion', $hoy)->distinct()->count('tipo_cultivo_id');
        $dolar = Divisa::where('fecha', $hoy)->where('tipo', config('agrotech.dolar_pesificacion'))->exists();

        return $granos < count(config('agrotech.cultivos')) || ! $dolar;
    }

    private function actualizarDivisas(bool $forzar): void
    {
        if (! $forzar && $this->enEnfriamiento('divisas')) {
            Log::info('Divisas en enfriamiento: no se consulta');

            return;
        }

        $proveedor = 'api';

        try {
            $dtos = (new CircuitBreaker('divisas'))->ejecutar(fn() => $this->divisas->obtener(now()));

            foreach ($dtos as $d) {
                Divisa::updateOrCreate(
                    ['fecha' => $d->fecha, 'tipo' => $d->tipo, 'fuente' => $proveedor],
                    ['valor_ars_usd' => $d->valor]
                );
            }

            $this->registrar('divisas', $proveedor, true, count($dtos) . ' valores');
        } catch (\Throwable $e) {
            Log::warning('Falló la actualización de divisas', ['proveedor' => $proveedor, 'error' => $e->getMessage()]);
            $this->registrar('divisas', $proveedor, false, $e->getMessage());
        }
    }

    private function actualizarGranos(string $hoy, bool $forzar): void
    {
        if (! $forzar && $this->enEnfriamiento('granos')) {
            Log::info('Granos en enfriamiento: no se consulta');

            return;
        }

        $proveedor = 'api';

        try {
            $dtos = (new CircuitBreaker('precios'))->ejecutar(fn() => $this->precios->obtener([], now()));

            foreach ($dtos as $d) {
                $c = $this->cotizaciones->guardar($d->tipoCultivoId, $d->fecha, $d->precioUsdTn, $d->mercadoReferencia, $proveedor);
                $this->cotizaciones->publicar($c);
            }

            $this->registrar('granos', $proveedor, true, count($dtos) . ' cotizaciones');
        } catch (\Throwable $e) {
            Log::warning('Falló la actualización de precios; sirvo el último dato', ['proveedor' => $proveedor, 'error' => $e->getMessage()]);
            $this->registrar('granos', $proveedor, false, $e->getMessage());
        }
    }

    private function enEnfriamiento(string $recurso): bool
    {
        $ultimo = RegistroActualizacion::where('recurso', $recurso)
            ->orderByDesc('intentado_en')
            ->orderByDesc('id')
            ->first();

        return $ultimo && ! $ultimo->ok && $ultimo->intentado_en->gt(now()->subMinutes(self::ENFRIAMIENTO_MINUTOS));
    }

    private function registrar(string $recurso, string $proveedor, bool $ok, string $detalle): void
    {
        RegistroActualizacion::create([
            'recurso' => $recurso,
            'proveedor' => $proveedor,
            'intentado_en' => now(),
            'ok' => $ok,
            'detalle' => mb_substr($detalle, 0, 255),
        ]);
    }
}
