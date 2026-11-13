<?php

namespace App\Http\Controllers;

use App\Servicios\ClienteServicios;
use App\Servicios\ValidadorToken;
use App\Support\Respuesta;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class ProxyController extends Controller
{
    public function __construct(private ClienteServicios $clientes, private ValidadorToken $validador) {}

    /** `POST /v1/auth/registro` y `POST /v1/auth/login`: las únicas rutas sin token. */
    public function publico(Request $request, string $ruta): Response
    {
        Log::info('Pedido público', ['ruta' => $ruta]);

        return $this->clientes->reenviar('auth', $request, $ruta, null);
    }

    public function reenviar(Request $request, string $servicio, string $ruta = ''): Response
    {
        $ruta = trim($ruta, '/');

        if (! $this->clientes->existe($servicio) || $this->esInterna($ruta)) {
            Log::warning('Ruta inexistente o interna', ['servicio' => $servicio, 'ruta' => $ruta]);

            return Respuesta::error('no_encontrado', 'Recurso inexistente', 404);
        }

        $identidad = $request->attributes->get('identidad');

        // Un token de sensor solo sirve para mandar lecturas.
        if (($identidad['autenticable'] ?? 'usuario') === 'dispositivo'
            && ! ($request->isMethod('POST') && $servicio === 'campo' && $ruta === 'lecturas')
        ) {
            Log::warning('Token de sensor usado fuera de /lecturas', ['servicio' => $servicio, 'ruta' => $ruta]);

            return Respuesta::error('sin_permiso', 'Un token de sensor solo puede enviar lecturas', 403);
        }

        if ($servicio === 'alertas' && $ruta === 'alertas/feed' && $request->isMethod('GET')) {
            return $this->clientes->transmitir($servicio, $request, $ruta, $identidad);
        }

        $respuesta = $this->clientes->reenviar($servicio, $request, $ruta, $identidad);

        // El logout borra también el token de la caché del gateway.
        if ($servicio === 'auth' && $ruta === 'logout' && $respuesta->getStatusCode() === 200) {
            $this->validador->olvidar((string) $request->attributes->get('token'));
            Log::info('Token revocado y borrado de la caché');
        }

        return $respuesta;
    }

    private function esInterna(string $ruta): bool
    {
        return $ruta === 'interno' || str_starts_with($ruta, 'interno/') || str_contains($ruta, '/interno') || str_contains($ruta, '..');
    }
}
