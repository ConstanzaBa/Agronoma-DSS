<?php

namespace App\Http\Controllers;

use App\Models\Dispositivo;
use App\Models\Lote;
use App\Support\Respuesta;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class DispositivoController extends Controller
{
    public function store(Request $request, int $id): JsonResponse
    {
        $lote = Lote::delContexto($this->contexto($request))->findOrFail($id);

        if ($excedido = $this->limiteExcedido($request, 'sensores')) {
            return $excedido;
        }

        $datos = $request->validate([
            'nombre' => 'required|string|max:80',
            'latitud' => 'nullable|numeric|between:-90,90',
            'longitud' => 'nullable|numeric|between:-180,180',
        ]);

        try {
            [$dispositivo, $token, $permisos] = DB::transaction(function () use ($lote, $datos) {
                $d = $lote->dispositivos()->create($datos + ['identificador_unico' => (string) Str::uuid()]);

                $r = Http::withHeaders([
                    'X-Gateway-Secret' => config('agrotech.gateway_secret'),
                    'Accept' => 'application/json',
                ])->timeout(3)->post(
                    rtrim(config('agrotech.auth_url'), '/') . '/api/v1/interno/tokens/dispositivo',
                    ['dispositivo_id' => $d->id, 'nombre' => $d->nombre]
                );

                if (! $r->successful()) {
                    throw new \RuntimeException('auth respondió ' . $r->status());
                }

                return [$d, $r->json('token'), $r->json('permisos')];
            });
        } catch (\Throwable $ex) {
            Log::error('No se pudo emitir el token del dispositivo', ['lote_id' => $lote->id, 'error' => $ex->getMessage()]);

            return Respuesta::error('servicio_no_disponible', 'No se pudo emitir el token del sensor', 503);
        }

        Log::info('Dispositivo registrado', ['id' => $dispositivo->id, 'lote_id' => $lote->id]);

        return response()->json([
            'dispositivo' => $dispositivo,
            'token' => $token,
            'permisos' => $permisos,
            'aviso' => 'Guardalo ahora: no se vuelve a mostrar',
        ], 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        return response()->json($this->delContexto($request, $id));
    }

    /** PATCH /dispositivos/{id}: activa o desactiva el sensor. No toca el token (vive solo en Auth). */
    public function actualizar(Request $request, int $id): JsonResponse
    {
        $datos = $request->validate(['activo' => 'required|boolean']);
        $dispositivo = $this->delContexto($request, $id);
        $dispositivo->update(['activo' => (bool) $datos['activo']]);

        Log::info('Estado de dispositivo cambiado', ['id' => $dispositivo->id, 'activo' => $dispositivo->activo]);

        return response()->json($dispositivo->fresh());
    }

    /** POST /dispositivos/{id}/token: pide a Auth un token nuevo. Campo no lo guarda; se devuelve una sola vez. */
    public function regenerarToken(Request $request, int $id): JsonResponse
    {
        $dispositivo = $this->delContexto($request, $id);

        try {
            $r = Http::withHeaders([
                'X-Gateway-Secret' => config('agrotech.gateway_secret'),
                'Accept' => 'application/json',
            ])->timeout(3)->post(
                rtrim((string) config('agrotech.auth_url'), '/') . '/api/v1/interno/tokens/dispositivo',
                ['dispositivo_id' => $dispositivo->id, 'nombre' => $dispositivo->nombre]
            );

            if (! $r->successful() || ! is_string($r->json('token')) || $r->json('token') === '') {
                throw new \RuntimeException('auth respondió ' . $r->status());
            }
        } catch (\Throwable $ex) {
            Log::error('No se pudo regenerar el token del dispositivo', ['id' => $dispositivo->id, 'error' => $ex->getMessage()]);

            return Respuesta::error('servicio_no_disponible', 'No se pudo emitir el token del sensor', 503);
        }

        Log::info('Token de dispositivo regenerado', ['id' => $dispositivo->id]);

        return response()->json([
            'dispositivo' => $dispositivo,
            'token' => $r->json('token'),
            'permisos' => $r->json('permisos'),
            'aviso' => 'Guardalo ahora: no se vuelve a mostrar. El token anterior deja de servir.',
        ]);
    }

    /** Solo dispositivos de lotes visibles en el contexto; ajeno o inexistente → 404. */
    private function delContexto(Request $request, int $id): Dispositivo
    {
        $contexto = $this->contexto($request);

        return Dispositivo::whereHas('lote', fn($q) => $q->delContexto($contexto))->findOrFail($id);
    }
}
