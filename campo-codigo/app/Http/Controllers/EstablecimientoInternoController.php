<?php

namespace App\Http\Controllers;

use App\Models\Establecimiento;
use Illuminate\Http\JsonResponse;

/** API interna para otros servicios (protegida por el secreto del gateway; no la usa el navegador). */
class EstablecimientoInternoController extends Controller
{
    /**
     * GET /interno/establecimientos/{id}/pertenece/{cuenta_id}
     * Responde 200 con pertenece=true solo si la estancia existe, está vigente (no dada de baja) y es de esa cuenta.
     * Cualquier otro caso (inexistente, dada de baja o de otra cuenta) es pertenece=false, sin distinguirlos.
     */
    public function pertenece(int $id, int $cuenta_id): JsonResponse
    {
        $pertenece = Establecimiento::where('id', $id)->where('cuenta_id', $cuenta_id)->exists();

        return response()->json([
            'pertenece' => $pertenece,
            'establecimiento_id' => $id,
            'cuenta_id' => $cuenta_id,
        ]);
    }
}
