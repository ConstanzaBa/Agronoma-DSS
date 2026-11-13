<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

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

            return response()->json(['estado' => 'ok', 'base' => 'ok']);
        } catch (\Throwable $e) {
            return response()->json(['estado' => 'error', 'base' => 'caida'], 503);
        }
    }
}
