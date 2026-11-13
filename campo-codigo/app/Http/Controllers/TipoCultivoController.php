<?php

namespace App\Http\Controllers;

use App\Models\TipoCultivo;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class TipoCultivoController extends Controller
{
    public function index(): JsonResponse
    {
        Log::debug('Catálogo de cultivos consultado');

        return response()->json(['data' => TipoCultivo::orderBy('nombre')->get()]);
    }
}
