<?php

use App\Http\Controllers\InternoController;
use App\Http\Controllers\MovimientoController;
use App\Http\Controllers\SiloController;
use Illuminate\Support\Facades\Route;

Route::pattern('id', '[0-9]+');

Route::middleware('gateway')->group(function () {
    Route::middleware('usuario')->group(function () {
        Route::get('/silos', [SiloController::class, 'index']);
        Route::post('/silos', [SiloController::class, 'store']);
        Route::get('/silos/{id}', [SiloController::class, 'show']);
        Route::put('/silos/{id}', [SiloController::class, 'update']);
        Route::put('/silos/{id}/mediciones', [SiloController::class, 'mediciones']);
        Route::get('/silos/{id}/stock', [SiloController::class, 'stock']);
        Route::get('/silos/{id}/movimientos', [MovimientoController::class, 'index']);
        Route::post('/silos/{id}/movimientos', [MovimientoController::class, 'store']);
    });

    Route::get('/interno/silos/{id}/resumen', [InternoController::class, 'resumen']);
});
