<?php

namespace App\Http\Controllers;

use App\Eventos\Evento;
use App\Eventos\PublicadorEventos;
use App\Excepciones\CampoNoDisponible;
use App\Models\Silo;
use App\Servicios\StockSilo;
use App\Servicios\ValidadorEstancia;
use App\Support\Respuesta;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SiloController extends Controller
{
    private function reglas(): array
    {
        return [
            'nombre' => 'required|string|max:80',
            'tipo' => 'required|in:silo,silobolsa',
            'capacidad_tn' => 'required|numeric|gt:0|max:99999999',
            'tipo_cultivo_id' => 'nullable|integer|min:1',
            'temperatura_limite_c' => 'nullable|numeric|between:-50,99.9',
        ];
    }

    /**
     * Confirma con Campo que la estancia es de la cuenta del Gateway (nunca la del body).
     * null = pertenece, se puede continuar; si no, la respuesta de error y no se toca el silo.
     */
    private function verificarEstancia(Request $request, int $establecimientoId): ?JsonResponse
    {
        $cuenta = (int) $request->attributes->get('cuenta_id');

        try {
            if (app(ValidadorEstancia::class)->pertenece($establecimientoId, $cuenta)) {
                return null;
            }
        } catch (CampoNoDisponible $e) {
            return Respuesta::error('servicio_no_disponible', 'No se pudo validar el establecimiento con Campo', 503);
        }

        Log::warning('Establecimiento que no pertenece a la cuenta', ['establecimiento_id' => $establecimientoId, 'cuenta_id' => $cuenta, 'usuario_id' => $request->attributes->get('usuario_id')]);

        return Respuesta::error('establecimiento_invalido', 'El establecimiento no pertenece a tu cuenta', 422, ['establecimiento_id' => ['El establecimiento no pertenece a tu cuenta']]);
    }

    private function buscar(Request $request, int $id): Silo
    {
        return Silo::visiblesPara($request)->findOrFail($id); // otra cuenta/estancia → 404
    }

    public function index(Request $request): JsonResponse
    {
        $consulta = Silo::visiblesPara($request);

        // El empleado ya está acotado a su estancia; el filtro solo aplica al admin.
        if ($request->attributes->get('es_admin') && $request->filled('establecimiento_id')) {
            $consulta->where('establecimiento_id', (int) $request->query('establecimiento_id'));
        }

        return Respuesta::paginado($consulta->orderBy('nombre')->paginate(Respuesta::porPagina($request)));
    }

    public function store(Request $request): JsonResponse
    {
        $datos = $request->validate($this->reglas() + ['establecimiento_id' => 'required|integer|min:1']);
        $datos['temperatura_limite_c'] = $datos['temperatura_limite_c'] ?? 25;
        $uid = $request->attributes->get('usuario_id');

        if ($rechazo = $this->verificarEstancia($request, (int) $datos['establecimiento_id'])) {
            return $rechazo;
        }

        // La cuenta sale de la identidad del Gateway, nunca del body (solo admin llega aquí).
        $cuenta = $request->attributes->get('cuenta_id');

        $silo = Silo::create($datos + ['cuenta_id' => $cuenta, 'usuario_id' => $uid]);
        Log::info('Silo creado', ['id' => $silo->id, 'cuenta_id' => $cuenta, 'usuario_id' => $uid, 'tipo' => $silo->tipo]);

        return response()->json($silo, 201);
    }

    public function show(Request $request, int $id, StockSilo $stock): JsonResponse
    {
        $silo = $this->buscar($request, $id);

        return response()->json($silo->toArray() + $stock->calcular($silo->id));
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $silo = $this->buscar($request, $id);
        $datos = $request->validate($this->reglas());
        $datos['temperatura_limite_c'] = $datos['temperatura_limite_c'] ?? 25;

        // La estancia del silo no se cambia al editar (se ignora cualquier establecimiento_id del body);
        // se reconfirma con Campo la estancia ya guardada antes de modificar.
        if ($rechazo = $this->verificarEstancia($request, (int) $silo->establecimiento_id)) {
            return $rechazo;
        }

        $silo->update($datos);
        Log::info('Silo editado', ['id' => $silo->id]);

        return response()->json($silo);
    }

    public function mediciones(Request $request, int $id, PublicadorEventos $publicador): JsonResponse
    {
        $silo = $this->buscar($request, $id);
        $datos = $request->validate([
            'humedad_grano_pct' => 'required|numeric|between:0,99.99',
            'temperatura_nucleo_c' => 'required|numeric|between:-50,99.9',
        ]);

        $silo->update($datos);
        Log::info('Medición registrada', ['silo_id' => $silo->id, 'temperatura_nucleo_c' => $silo->temperatura_nucleo_c]);

        $publicador->publicar('silo.temperatura', Evento::crear('silo_temperatura', [
            'silo_id' => $silo->id,
            'cuenta_id' => $silo->cuenta_id,
            'establecimiento_id' => $silo->establecimiento_id,
            'usuario_id' => $silo->usuario_id,
            'temperatura_nucleo_c' => (float) $silo->temperatura_nucleo_c,
            'temperatura_limite_c' => (float) $silo->temperatura_limite_c,
        ]));

        return response()->json($silo);
    }

    public function stock(Request $request, int $id, StockSilo $stock): JsonResponse
    {
        $silo = $this->buscar($request, $id);
        $calculo = $stock->calcular($silo->id);

        return response()->json([
            'silo_id' => $silo->id,
            'capacidad_tn' => $silo->capacidad_tn,
            'ocupacion_pct' => round($calculo['stock_tn'] / $silo->capacidad_tn * 100, 1),
        ] + $calculo);
    }
}
