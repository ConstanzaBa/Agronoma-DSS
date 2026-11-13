<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SaludController extends Controller
{
    public function live(): JsonResponse
    {
        return response()->json(['estado' => 'ok']);
    }

    public function ready(): JsonResponse
    {
        try {
            DB::select('select 1');

            return response()->json(['estado' => 'ok', 'base' => 'ok', 'jobs_pendientes' => DB::table('jobs')->count()]);
        } catch (\Throwable $e) {
            Log::error('Health ready: la base no responde', ['error' => $e->getMessage()]);

            return response()->json(['estado' => 'error', 'base' => 'caida'], 503);
        }
    }
}
