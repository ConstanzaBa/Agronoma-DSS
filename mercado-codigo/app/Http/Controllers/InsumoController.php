<?php

namespace App\Http\Controllers;

use App\Models\PrecioInsumo;
use App\Support\Respuesta;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class InsumoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'insumo' => 'nullable|in:urea,pda,gasoil',
            'desde' => 'nullable|date_format:Y-m-d',
            'hasta' => 'nullable|date_format:Y-m-d',
        ]);

        $consulta = PrecioInsumo::query();

        if ($insumo = $request->query('insumo')) {
            $consulta->where('insumo', $insumo);
        }

        if ($desde = $request->query('desde')) {
            $consulta->where('fecha', '>=', $desde);
        }

        if ($hasta = $request->query('hasta')) {
            $consulta->where('fecha', '<=', $hasta);
        }

        return Respuesta::paginado($consulta->orderByDesc('fecha')->orderBy('insumo')->paginate(Respuesta::porPagina($request)));
    }

    public function store(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'insumo' => 'required|in:urea,pda,gasoil',
            'fecha' => 'required|date_format:Y-m-d|before_or_equal:today',
            'precio_usd' => 'required|numeric|gt:0|max:99999999',
        ]);
        $uid = $request->attributes->get('usuario_id');

        $p = PrecioInsumo::updateOrCreate(
            ['insumo' => $datos['insumo'], 'fecha' => $datos['fecha'], 'fuente' => 'manual'],
            ['precio_usd' => $datos['precio_usd'], 'unidad' => $datos['insumo'] === 'gasoil' ? 'litro' : 'tn', 'creado_por' => $uid]
        );
        Log::info('Precio de insumo cargado a mano', ['id' => $p->id, 'insumo' => $p->insumo, 'usuario_id' => $uid]);

        return response()->json($p, $p->wasRecentlyCreated ? 201 : 200);
    }
}
