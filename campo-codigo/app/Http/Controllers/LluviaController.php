<?php

namespace App\Http\Controllers;

use App\Models\Lote;
use App\Models\RegistroLluvia;
use App\Support\Respuesta;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class LluviaController extends Controller
{
    public function index(Request $request, int $id): JsonResponse
    {
        $request->validate(['desde' => 'nullable|date_format:Y-m-d', 'hasta' => 'nullable|date_format:Y-m-d']);
        $lote = Lote::delContexto($this->contexto($request))->findOrFail($id);
        $consulta = RegistroLluvia::where('lote_id', $lote->id);

        if ($desde = $request->query('desde')) {
            $consulta->where('fecha_registro', '>=', $desde);
        }

        if ($hasta = $request->query('hasta')) {
            $consulta->where('fecha_registro', '<=', $hasta);
        }

        return Respuesta::paginado($consulta->orderByDesc('fecha_registro')->paginate(Respuesta::porPagina($request)));
    }

    public function store(Request $request, int $id): JsonResponse
    {
        $uid = $request->attributes->get('usuario_id');
        $lote = Lote::delContexto($this->contexto($request))->findOrFail($id);
        $datos = $request->validate([
            'milimetros' => 'required|numeric|min:0|max:1000',
            'fecha_registro' => 'required|date_format:Y-m-d|before_or_equal:today',
            'observacion' => 'nullable|string|max:255',
            'clave_idempotencia' => 'required|uuid',
        ]);

        $previo = RegistroLluvia::where('clave_idempotencia', $datos['clave_idempotencia'])->first();

        if ($previo) {
            return $this->repetido($previo, $lote->id);
        }

        try {
            $registro = RegistroLluvia::create($datos + ['lote_id' => $lote->id, 'usuario_id' => $uid]);
        } catch (UniqueConstraintViolationException $e) {
            return $this->repetido(RegistroLluvia::where('clave_idempotencia', $datos['clave_idempotencia'])->first(), $lote->id);
        }

        Log::info('Lluvia registrada', ['id' => $registro->id, 'lote_id' => $lote->id, 'mm' => $registro->milimetros]);

        return response()->json($registro, 201);
    }

    private function repetido(RegistroLluvia $previo, int $loteId): JsonResponse
    {
        if ($previo->lote_id !== $loteId) {
            Log::warning('Clave de idempotencia usada en otro lote', ['clave' => $previo->clave_idempotencia]);

            return Respuesta::error('conflicto', 'La clave de idempotencia ya se usó en otro lote', 409);
        }

        Log::info('Reintento de lluvia ignorado', ['id' => $previo->id]);

        return response()->json($previo, 200);
    }
}
