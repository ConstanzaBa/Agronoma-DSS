<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\InternoController;
use Illuminate\Support\Facades\Route;

Route::middleware('gateway')->group(function () {
    Route::post('/registro', [AuthController::class, 'registro']);
    Route::post('/login', [AuthController::class, 'login']);

    Route::middleware('token')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
    });

    Route::prefix('interno')->group(function () {
        Route::post('/tokens/validar', [InternoController::class, 'validar']);
        Route::post('/tokens/dispositivo', [InternoController::class, 'dispositivo']);
    });
});
