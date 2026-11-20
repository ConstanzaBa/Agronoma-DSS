<?php

namespace App\Http\Controllers;

use App\Excepciones\ServicioNoDisponible;
use App\Excepciones\SinCuenta;
use App\Servicios\ClienteServicios;
use App\Servicios\ContextoUsuario;
use App\Servicios\ValidadorToken;
use App\Support\Respuesta;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class ProxyController extends Controller
{
    /** Servicios que reciben X-Cuenta-Id / X-Establecimiento-Id; el contexto lo resuelve Campo. */
    private const CON_CONTEXTO = ['silos', 'alertas', 'mercado'];

    public function __construct(private ClienteServicios $clientes, private ValidadorToken $validador, private ContextoUsuario $contexto) {}

    /** Rutas sin token: `POST /v1/auth/{registro,login,contratacion}` (y la bandeja simulada de la demo). */
    public function publico(Request $request, string $ruta): Response
    {
        Log::info('Pedido público', ['ruta' => $ruta]);

        return $this->clientes->reenviar('auth', $request, $ruta, null);
    }

    /** `GET /v1/auth/correo-simulado/{token}`: bandeja simulada de la demo (Auth decide si está habilitada). */
    public function correoSimulado(Request $request, string $token): Response
    {
        return $this->clientes->reenviar('auth', $request, "correo-simulado/$token", null);
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

        if (in_array($servicio, self::CON_CONTEXTO, true)) {
            try {
                $identidad = $this->contexto->resolver($identidad ?? []);
            } catch (SinCuenta $e) {
                return Respuesta::error('sin_cuenta', 'El usuario no pertenece a ninguna cuenta', 403);
            } catch (ServicioNoDisponible $e) {
                return Respuesta::error('servicio_no_disponible', 'No se pudo resolver el contexto del usuario', 503);
            }
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

        // Al completar el primer ingreso, la identidad cacheada (pendiente=true) ya no es válida.
        if ($servicio === 'auth' && $ruta === 'primer-ingreso' && $request->isMethod('POST') && $respuesta->getStatusCode() === 200) {
            $this->validador->olvidar((string) $request->attributes->get('token'));
        }

        return $respuesta;
    }

    private function esInterna(string $ruta): bool
    {
        // Sin distinguir mayúsculas y sin caracteres de escape (%, \) que permitan disfrazar el segmento.
        return preg_match('#(^|/)interno(/|$)#i', $ruta) === 1
            || str_contains($ruta, '/interno')
            || str_contains($ruta, '..')
            || str_contains($ruta, '%')
            || str_contains($ruta, '\\');
    }
}
