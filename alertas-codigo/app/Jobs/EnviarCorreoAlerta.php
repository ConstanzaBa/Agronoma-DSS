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

        $r = Http::withHeaders([
            'X-Gateway-Secret' => config('agrotech.gateway_secret'),
            'Accept' => 'application/json',
        ])->timeout(3)->get(rtrim((string) config('agrotech.auth_url'), '/') . "/api/v1/interno/usuarios/{$this->usuarioId}");

        if (! $r->successful() || ! $r->json('correo')) {
            throw new \RuntimeException('No se pudo obtener el correo del usuario (auth respondió ' . $r->status() . ')');
        }

        if ($r->json('activo') === false) {
            Log::info('Correo omitido: usuario desactivado', ['usuario_id' => $this->usuarioId]);

            return;
        }

        Mail::raw($alerta->mensaje, fn($m) => $m->to($r->json('correo'))->subject($this->asunto));
        Log::info('Correo de alerta enviado', ['alerta_id' => $this->alertaId]);
    }
}
