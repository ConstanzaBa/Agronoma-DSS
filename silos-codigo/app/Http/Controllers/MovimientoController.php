<?php

namespace App\Http\Controllers;

use App\Models\Movimiento;
use App\Models\Silo;
use App\Servicios\StockSilo;
use App\Support\Respuesta;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class MovimientoController extends Controller
{
    public function __construct(private StockSilo $stock) {}

    public function index(Request $request, int $id): JsonResponse
    {
        $request->validate(['desde' => 'nullable|date_format:Y-m-d', 'hasta' => 'nullable|date_format:Y-m-d']);
        $silo = Silo::visiblesPara($request)->findOrFail($id);
        $consulta = Movimiento::where('silo_id', $silo->id);

        if ($desde = $request->query('desde')) {
            $consulta->where('fecha_movimiento', '>=', $desde);
        }

        if ($hasta = $request->query('hasta')) {
            $consulta->where('fecha_movimiento', '<=', $hasta);
        }

        return Respuesta::paginado(
            $consulta->orderByDesc('fecha_movimiento')->orderByDesc('id')->paginate(Respuesta::porPagina($request))
        );
    }

    public function store(Request $request, int $id): JsonResponse
    {
        $uid = $request->attributes->get('usuario_id');
        $datos = $request->validate([
            'direccion' => 'required|in:in,out',
            'toneladas' => 'required|numeric|gt:0|max:99999999',
            'fecha_movimiento' => 'required|date_format:Y-m-d|before_or_equal:today',
            'observacion' => 'nullable|string|max:255',
            'clave_idempotencia' => 'required|uuid',
        ]);
        $toneladas = round((float) $datos['toneladas'], 2);

        try {
            [$estado, $cuerpo] = DB::transaction(function () use ($request, $id, $uid, $datos, $toneladas) {
                // 1) Bloqueo de la fila del silo: los demás movimientos del mismo silo esperan acá.
                // El alcance (cuenta y, para empleados, estancia) se aplica en la misma consulta del bloqueo.
                $silo = Silo::visiblesPara($request)->where('id', $id)->lockForUpdate()->firstOrFail();

                // 2) Idempotencia: la misma clave devuelve el movimiento ya registrado.
                $previo = Movimiento::where('clave_idempotencia', $datos['clave_idempotencia'])->first();

                if ($previo) {
                    if ((int) $previo->silo_id !== (int) $silo->id) {
                        return [409, ['codigo' => 'conflicto', 'mensaje' => 'La clave de idempotencia ya se usó en otro silo']];
                    }

                    Log::info('Reintento de movimiento ignorado', ['movimiento_id' => $previo->id]);

                    return [200, $previo];
                }

                // 3) Reglas de negocio con el stock real, ya bajo bloqueo.
                $stock = $this->stock->calcular($silo->id)['stock_tn'];

                if ($datos['direccion'] === 'out' && $toneladas > $stock) {
                    Log::warning('Salida rechazada por stock insuficiente', ['silo_id' => $silo->id, 'pedido_tn' => $toneladas, 'stock_tn' => $stock]);

                    return [422, [
                        'codigo' => 'stock_insuficiente',
                        'mensaje' => 'La salida supera el stock del silo',
                        'detalles' => ['stock_tn' => $stock],
                    ]];
                }

                if ($datos['direccion'] === 'in' && round($stock + $toneladas, 2) > (float) $silo->capacidad_tn) {
                    Log::warning('Entrada rechazada por capacidad', ['silo_id' => $silo->id, 'pedido_tn' => $toneladas, 'stock_tn' => $stock]);

                    return [422, [
                        'codigo' => 'capacidad_excedida',
                        'mensaje' => 'La entrada supera la capacidad del silo',
                        'detalles' => ['stock_tn' => $stock, 'capacidad_tn' => (float) $silo->capacidad_tn],
                    ]];
                }

                // 4) Registro y fecha de almacenamiento.
                $movimiento = Movimiento::create([
                    'silo_id' => $silo->id,
                    'usuario_id' => $uid,
                    'direccion' => $datos['direccion'],
                    'toneladas' => $toneladas,
                    'fecha_movimiento' => $datos['fecha_movimiento'],
                    'observacion' => $datos['observacion'] ?? null,
                    'clave_idempotencia' => $datos['clave_idempotencia'],
                ]);

                $nuevoStock = $datos['direccion'] === 'in' ? round($stock + $toneladas, 2) : round($stock - $toneladas, 2);

                if ($datos['direccion'] === 'in' && $silo->almacenado_desde === null) {
                    $silo->update(['almacenado_desde' => $datos['fecha_movimiento']]);
                } elseif ($nuevoStock <= 0) {
                    $silo->update(['almacenado_desde' => null]);
                }

                Log::info('Movimiento registrado', [
                    'silo_id' => $silo->id,
                    'direccion' => $datos['direccion'],
                    'toneladas' => $toneladas,
                    'stock_tn' => $nuevoStock,
                ]);

                return [201, $movimiento];
            });
        } catch (UniqueConstraintViolationException $e) {
            Log::warning('Clave de idempotencia repetida en otro silo', ['clave' => $datos['clave_idempotencia']]);

            return Respuesta::error('conflicto', 'La clave de idempotencia ya se usó en otro silo', 409);
        }

        return response()->json($cuerpo, $estado);
    }
}
