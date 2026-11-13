<?php

namespace App\Http\Controllers;

use App\Clima\ProveedorClima;
use App\Models\Establecimiento;
use App\Models\RegistroClima;
use App\Support\Respuesta;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class ClimaController extends Controller
{
    public function show(Request $request, int $id, ProveedorClima $proveedor): JsonResponse
    {
        $est = Establecimiento::delUsuario($request->attributes->get('usuario_id'))->findOrFail($id);
        $clave = 'clima:' . $est->id;

        if ($enCache = Cache::get($clave)) {
            return response()->json($enCache);
        }

        try {
            $dato = $proveedor->obtener($est->latitud_centro, $est->longitud_centro);
            $registro = RegistroClima::create($dato + ['establecimiento_id' => $est->id, 'consultado_en' => now()]);
            $cuerpo = $this->armar($registro, false);
            Cache::put($clave, $cuerpo, now()->addMinutes(30));

            return response()->json($cuerpo);
        } catch (\Throwable $e) {
            Log::warning('Proveedor de clima falló', ['proveedor' => $proveedor::class, 'error' => $e->getMessage()]);
        }

        $ultimo = RegistroClima::where('establecimiento_id', $est->id)->latest('consultado_en')->first();

        if ($ultimo) {
            Log::warning('Sirvo el último clima guardado (desactualizado)', ['establecimiento_id' => $est->id]);

            return response()->json($this->armar($ultimo, true));
        }

        return Respuesta::error('clima_no_disponible', 'No hay datos de clima disponibles', 503);
    }

    private function armar(RegistroClima $r, bool $desactualizada): array
    {
        return [
            'establecimiento_id' => $r->establecimiento_id,
            'consultado_en' => $r->consultado_en->toIso8601String(),
            'actual' => [
                'temperatura_c' => $r->temperatura_c,
                'humedad_pct' => $r->humedad_pct,
                'precipitacion_mm' => $r->precipitacion_mm,
                'viento_kmh' => $r->viento_kmh,
            ],
            'pronostico' => $r->pronostico,
            'fuente' => $r->fuente,
            'desactualizada' => $desactualizada,
        ];
    }
}
