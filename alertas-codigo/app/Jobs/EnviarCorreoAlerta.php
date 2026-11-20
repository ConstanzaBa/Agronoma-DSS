<?php

namespace App\Jobs;

use App\Models\Alerta;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class EnviarCorreoAlerta implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable;

    public $tries = 3;
    public $backoff = [30, 120, 600];

    public function __construct(public int $alertaId, public int $usuarioId, public string $asunto) {}

    public function handle(): void
    {
        $alerta = Alerta::find($this->alertaId);

        if (! $alerta) {
            Log::warning('Correo cancelado: la alerta ya no existe', ['alerta_id' => $this->alertaId]);

            return;
        }

        // Con cuenta: el destinatario es el administrador de esa cuenta (según Auth).
        // Sin cuenta, o si Auth no tiene un administrador activo para ella: se mantiene el criterio anterior por usuario_id.
        $correo = $alerta->cuenta_id !== null ? $this->correoDelAdministrador((int) $alerta->cuenta_id) : null;

        if ($correo === null) {
            $correo = $this->correoPorUsuario();
        }

        if ($correo === null) {
            return;
        }

        Mail::raw($alerta->mensaje, fn($m) => $m->to($correo)->subject($this->asunto));
        Log::info('Correo de alerta enviado', ['alerta_id' => $this->alertaId]);
    }

    private function authGet(string $ruta): \Illuminate\Http\Client\Response
    {
        return Http::withHeaders([
            'X-Gateway-Secret' => config('agrotech.gateway_secret'),
            'Accept' => 'application/json',
        ])->timeout(3)->get(rtrim((string) config('agrotech.auth_url'), '/') . $ruta);
    }

    /**
     * GET /interno/cuentas/{cuenta_id}/administrador. Devuelve el correo del administrador activo, o null si
     * hay que usar el criterio anterior (404 o administrador inactivo). Si Auth falla, lanza para que la cola reintente.
     */
    private function correoDelAdministrador(int $cuentaId): ?string
    {
        $r = $this->authGet("/api/v1/interno/cuentas/{$cuentaId}/administrador");

        if ($r->status() === 404) {
            Log::info('Auth no tiene administrador para la cuenta; se usa el usuario de la alerta', ['cuenta_id' => $cuentaId]);

            return null;
        }

        if (! $r->successful() || ! $r->json('correo')) {
            throw new \RuntimeException('No se pudo obtener el administrador de la cuenta (auth respondió ' . $r->status() . ')');
        }

        if ($r->json('activo') !== true) {
            Log::info('Administrador de la cuenta desactivado; se usa el usuario de la alerta', ['cuenta_id' => $cuentaId]);

            return null;
        }

        return $r->json('correo');
    }

    /** Comportamiento anterior: correo del usuario de la alerta (omite si está desactivado). */
    private function correoPorUsuario(): ?string
    {
        $r = $this->authGet("/api/v1/interno/usuarios/{$this->usuarioId}");

        if (! $r->successful() || ! $r->json('correo')) {
            throw new \RuntimeException('No se pudo obtener el correo del usuario (auth respondió ' . $r->status() . ')');
        }

        if ($r->json('activo') === false) {
            Log::info('Correo omitido: usuario desactivado', ['usuario_id' => $this->usuarioId]);

            return null;
        }

        return $r->json('correo');
    }
}
