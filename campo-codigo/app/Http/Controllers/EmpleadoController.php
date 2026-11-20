<?php

namespace App\Http\Controllers;

use App\Models\Empleado;
use App\Support\Respuesta;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/** Gestión de empleados por el administrador de la cuenta (ver rutas: solo admin.cuenta). */
class EmpleadoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $pagina = Empleado::where('cuenta_id', $this->contexto($request)->cuentaId)
            ->with('asignaciones.establecimiento')
            ->orderBy('id')
            ->paginate(Respuesta::porPagina($request));

        $pagina->setCollection($pagina->getCollection()->map(fn($e) => $this->armar($e)));

        return Respuesta::paginado($pagina);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        return response()->json($this->armar($this->buscar($request, $id)));
    }

    /**
     * DELETE /empleados/{id}: baja lógica coordinada. Primero se desactiva el usuario en Auth (si falla, no se
     * cambia nada y se puede reintentar); después se da de baja en Campo, lo que libera el cupo del plan.
     */
    public function baja(Request $request, int $id): JsonResponse
    {
        $empleado = $this->buscar($request, $id);

        if ($empleado->estado !== 'baja') {
            try {
                $r = Http::withHeaders(['X-Gateway-Secret' => config('agrotech.gateway_secret'), 'Accept' => 'application/json'])
                    ->timeout(3)
                    ->post(rtrim((string) config('agrotech.auth_url'), '/') . "/api/v1/interno/usuarios/{$empleado->usuario_id}/desactivar");

                if (! $r->successful()) {
                    throw new \RuntimeException('auth respondió ' . $r->status());
                }
            } catch (\Throwable $e) {
                Log::error('No se pudo desactivar al usuario en Auth', ['empleado_id' => $empleado->id, 'error' => $e->getMessage()]);

                return Respuesta::error('servicio_no_disponible', 'No se pudo dar de baja al empleado; reintentá', 503);
            }

            DB::transaction(function () use ($empleado) {
                $empleado->update(['estado' => 'baja']);
                $empleado->asignaciones()->where('estado', 'activa')->update(['estado' => 'inactiva']);
            });

            Log::info('Empleado dado de baja', ['id' => $empleado->id]);
        }

        return response()->json($this->armar($empleado->fresh('asignaciones.establecimiento')));
    }

    private function buscar(Request $request, int $id): Empleado
    {
        return Empleado::where('cuenta_id', $this->contexto($request)->cuentaId)
            ->with('asignaciones.establecimiento')
            ->findOrFail($id);
    }

    private function armar(Empleado $e): array
    {
        $asignacion = $e->asignaciones->where('estado', 'activa')->sortByDesc('id')->first();

        return [
            'id' => $e->id,
            'usuario_id' => $e->usuario_id,
            'rol' => $e->rol,
            'estado' => $e->estado,
            'estancia' => $asignacion?->establecimiento?->only(['id', 'nombre']),
            'usuario' => $this->datosDeAuth($e->usuario_id),
        ];
    }

    /** Datos personales desde el endpoint interno de Auth (nunca su base). Si Auth no responde, null. */
    private function datosDeAuth(int $usuarioId): ?array
    {
        try {
            $r = Http::withHeaders(['X-Gateway-Secret' => config('agrotech.gateway_secret'), 'Accept' => 'application/json'])
                ->timeout(3)
                ->get(rtrim((string) config('agrotech.auth_url'), '/') . "/api/v1/interno/usuarios/$usuarioId");

            return $r->successful() ? array_intersect_key($r->json(), array_flip(['nombre', 'apellido', 'correo', 'profesion', 'telefono', 'activo'])) : null;
        } catch (\Throwable $e) {
            Log::warning('No se pudieron obtener datos del usuario en Auth', ['usuario_id' => $usuarioId]);

            return null;
        }
    }
}
