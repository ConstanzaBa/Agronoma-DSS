<?php

use App\Http\Controllers\ClimaController;
use App\Http\Controllers\DispositivoController;
use App\Http\Controllers\EstablecimientoController;
use App\Http\Controllers\LecturaController;
use App\Http\Controllers\LoteController;
use App\Http\Controllers\LluviaController;
use App\Http\Controllers\SimuladorController;
use App\Http\Controllers\TipoCultivoController;
use Illuminate\Support\Facades\Route;

Route::pattern('id', '[0-9]+');

Route::middleware('gateway')->group(function () {
    Route::get('/tipos-cultivo', [TipoCultivoController::class, 'index']);

    Route::middleware('usuario')->group(function () {
        Route::get('/establecimientos', [EstablecimientoController::class, 'index']);
        Route::post('/establecimientos', [EstablecimientoController::class, 'store']);
        Route::get('/establecimientos/{id}', [EstablecimientoController::class, 'show']);
        Route::put('/establecimientos/{id}', [EstablecimientoController::class, 'update']);
        Route::delete('/establecimientos/{id}', [EstablecimientoController::class, 'destroy']);

        Route::get('/establecimientos/{id}/lotes', [LoteController::class, 'index']);
        Route::post('/establecimientos/{id}/lotes', [LoteController::class, 'store']);
        Route::get('/establecimientos/{id}/clima', [ClimaController::class, 'show']);

        Route::get('/lotes/{id}', [LoteController::class, 'show']);
        Route::put('/lotes/{id}', [LoteController::class, 'update']);
        Route::delete('/lotes/{id}', [LoteController::class, 'destroy']);

        Route::post('/lotes/{id}/dispositivos', [DispositivoController::class, 'store']);
        Route::get('/dispositivos/{id}', [DispositivoController::class, 'show']);

        Route::get('/lotes/{id}/lecturas', [LecturaController::class, 'index']);
        Route::get('/lotes/{id}/lluvia', [LluviaController::class, 'index']);
        Route::post('/lotes/{id}/lluvia', [LluviaController::class, 'store']);
    });

    Route::post('/lecturas', [LecturaController::class, 'store'])->middleware('sensor');
    Route::post('/interno/simular/sensor', [SimuladorController::class, 'sensor']);
});
