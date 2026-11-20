<?php

namespace App\Servicios;

use App\Excepciones\ServicioNoDisponible;
use App\Excepciones\SinCuenta;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Obtiene de Campo (autoridad de cuenta, rol y estancia) el contexto del usuario ya autenticado por Auth.
 * Se consulta en cada pedido: no hay caché, para que una baja o un traslado tengan efecto inmediato.
 */
class ContextoUsuario
{
    /** Roles del contrato. Solo se usan para validar la respuesta de Campo; el gateway no decide permisos. */
    private const ROLES = ['admin', 'productor', 'ingeniero_agronomo', 'asesor_tecnico', 'contratista', 'otro'];

    /**
     * Devuelve la identidad de Auth con la clave 'contexto' = [cuenta_id, rol, establecimiento_id].
     *
     * @throws SinCuenta            Campo respondió 404 sin_cuenta
     * @throws ServicioNoDisponible timeout, 5xx, circuito abierto o respuesta inválida: nunca se sigue sin contexto
     */
    public function resolver(array $identidad): array
    {
        $uid = $identidad['usuario_id'] ?? null;

        if (! is_numeric($uid) || (int) $uid < 1) {
            Log::warning('Identidad sin usuario_id: no hay contexto que resolver');

            throw new SinCuenta();
        }

        $uid = (int) $uid;
        $breaker = new CircuitBreaker('campo');

        if (! $breaker->permitido()) {
            Log::warning('Circuito abierto: no se consulta el contexto en campo');

            throw new ServicioNoDisponible('campo');
        }

        try {
            $r = Http::withHeaders([
                'X-Gateway-Secret' => config('servicios.secreto'),
                'Accept' => 'application/json',
            ])->timeout((int) config('servicios.servicios.campo.timeout', 3))->get(
                rtrim((string) config('servicios.servicios.campo.url'), '/') . "/api/v1/interno/usuarios/{$uid}/contexto"
            );
        } catch (\Throwable $e) {
            $breaker->fallo();
            Log::error('campo no respondió al pedir el contexto', ['usuario_id' => $uid, 'error' => mb_substr($e->getMessage(), 0, 200)]);

            throw new ServicioNoDisponible('campo');
        }

        if ($r->status() === 404 && $r->json('codigo') === 'sin_cuenta') {
            $breaker->exito();
            Log::info('Usuario sin cuenta según campo', ['usuario_id' => $uid]);

            throw new SinCuenta();
        }

        if (! $r->successful()) {
            $breaker->fallo();
            Log::error('campo respondió con error al pedir el contexto', ['usuario_id' => $uid, 'estado' => $r->status()]);

            throw new ServicioNoDisponible('campo');
        }

        $contexto = $this->validar($uid, $r->json());

        if ($contexto === null) {
            $breaker->fallo();
            Log::error('Contexto inválido recibido de campo', ['usuario_id' => $uid]);

            throw new ServicioNoDisponible('campo');
        }

        $breaker->exito();

        return $identidad + ['contexto' => $contexto];
    }

    /** @return array{cuenta_id:int,rol:string,establecimiento_id:?int}|null */
    private function validar(int $uid, mixed $d): ?array
    {
        if (! is_array($d) || (int) ($d['usuario_id'] ?? 0) !== $uid) {
            return null;
        }

        $cuenta = $d['cuenta_id'] ?? null;
        $rol = $d['rol'] ?? null;
        $estancia = $d['establecimiento_id'] ?? null;

        if (! is_int($cuenta) || $cuenta < 1 || ! in_array($rol, self::ROLES, true)) {
            return null;
        }

        // Administrador: nunca con estancia. Empleado: siempre con estancia.
        if ($rol === 'admin' ? $estancia !== null : (! is_int($estancia) || $estancia < 1)) {
            return null;
        }

        return ['cuenta_id' => $cuenta, 'rol' => $rol, 'establecimiento_id' => $estancia];
    }
}
