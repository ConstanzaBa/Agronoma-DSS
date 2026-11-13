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
        $lote = Lote::delUsuario($request->attributes->get('usuario_id'))->findOrFail($id);
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
        $uid = $request->attributes->get('usuario_id');
        $dispositivo = Dispositivo::whereHas('lote', fn($q) => $q->delUsuario($uid))->findOrFail($id);

        return response()->json($dispositivo);
    }
}
