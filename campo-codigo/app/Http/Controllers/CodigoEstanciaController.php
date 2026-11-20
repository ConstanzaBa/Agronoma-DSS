<?php

namespace App\Http\Controllers;

use App\Models\CodigoEstancia;
use App\Models\Establecimiento;
use App\Support\Respuesta;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/** Códigos de registro de empleados. Solo el administrador de la cuenta (ver rutas). */
class CodigoEstanciaController extends Controller
{
    /** POST /establecimientos/{id}/codigos: estancia propia y vigente; ajena o dada de baja → 404. */
    public function store(Request $request, int $id): JsonResponse
    {
        $contexto = $this->contexto($request);
        $est = Establecimiento::delContexto($contexto)->findOrFail($id);

        for ($intento = 0; ; $intento++) {
            try {
                $codigo = CodigoEstancia::create([
                    'cuenta_id' => $contexto->cuentaId,
                    'establecimiento_id' => $est->id,
                    'codigo' => CodigoEstancia::generar(),
                    'estado' => 'activo',
                ]);
                break;
            } catch (UniqueConstraintViolationException $e) {
                if ($intento >= 3) {
                    throw $e;
                }
            }
        }

        Log::info('Código de estancia generado', ['id' => $codigo->id, 'establecimiento_id' => $est->id]);

        return response()->json($this->armar($codigo), 201);
    }

    /** GET /codigos?estado=activo|usado|revocado */
    public function index(Request $request): JsonResponse
    {
        $request->validate(['estado' => 'nullable|in:activo,usado,revocado']);
        $consulta = CodigoEstancia::where('cuenta_id', $this->contexto($request)->cuentaId);

        if ($request->filled('estado')) {
            $consulta->where('estado', $request->query('estado'));
        }

        $pagina = $consulta->orderByDesc('id')->paginate(Respuesta::porPagina($request));
        $pagina->setCollection($pagina->getCollection()->map(fn($c) => $this->armar($c)));

        return Respuesta::paginado($pagina);
    }

    /** DELETE /codigos/{id}: revoca un código activo. Revocar uno ya revocado es idempotente; uno usado no se revoca. */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $codigo = CodigoEstancia::where('cuenta_id', $this->contexto($request)->cuentaId)->findOrFail($id);

        if ($codigo->estado === 'usado') {
            return Respuesta::error('conflicto', 'El código ya fue usado', 409);
        }

        if ($codigo->estado === 'activo') {
            $codigo->update(['estado' => 'revocado']);
            Log::info('Código de estancia revocado', ['id' => $codigo->id]);
        }

        return response()->json($this->armar($codigo));
    }

    private function armar(CodigoEstancia $c): array
    {
        return [
            'id' => $c->id,
            'codigo' => $c->codigo,
            'establecimiento_id' => $c->establecimiento_id,
            'estado' => $c->estado,
            'empleado_id' => $c->empleado_id,
            'usado_en' => $c->usado_en?->toIso8601String(),
            'creado_en' => $c->creado_en?->toIso8601String(),
        ];
    }
}
