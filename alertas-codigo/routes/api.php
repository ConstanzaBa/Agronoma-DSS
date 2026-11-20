<?php

use App\Http\Controllers\AlertaController;
use App\Http\Controllers\InternoController;
use App\Http\Controllers\ObjetivoController;
use App\Http\Controllers\ReglaController;
use Illuminate\Support\Facades\Route;

Route::pattern('id', '[0-9]+');

Route::middleware('gateway')->group(function () {
    Route::middleware('usuario')->group(function () {
        Route::get('/alertas', [AlertaController::class, 'index']);
        Route::get('/alertas/feed', [AlertaController::class, 'feed']);
        Route::get('/alertas/{id}', [AlertaController::class, 'show']);
        Route::patch('/alertas/{id}/atender', [AlertaController::class, 'atender']);
        Route::patch('/alertas/{id}/resolver', [AlertaController::class, 'resolver']);

        Route::get('/reglas', [ReglaController::class, 'index']);

        Route::middleware('admin')->group(function () {
            // Objetivos de precio: información comercial de la cuenta, solo admin.
            Route::get('/objetivos-precio', [ObjetivoController::class, 'index']);
            Route::post('/objetivos-precio', [ObjetivoController::class, 'store']);
            Route::put('/objetivos-precio/{id}', [ObjetivoController::class, 'update']);
            Route::delete('/objetivos-precio/{id}', [ObjetivoController::class, 'destroy']);

            // Reglas globales: el controlador responde 403 reglas_globales (ver ReglaController).
            Route::post('/reglas', [ReglaController::class, 'store']);
            Route::put('/reglas/{id}', [ReglaController::class, 'update']);
        });
    });

    Route::post('/interno/eventos', [InternoController::class, 'eventos']);
    Route::post('/interno/procesar-cola', [InternoController::class, 'procesarCola']);
});
