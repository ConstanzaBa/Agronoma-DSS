<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ContratacionController;
use App\Http\Controllers\CorreoSimuladoController;
use App\Http\Controllers\InternoController;
use App\Http\Controllers\PerfilController;
use Illuminate\Support\Facades\Route;

Route::middleware('gateway')->group(function () {
    Route::post('/registro', [AuthController::class, 'registro']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/contratacion', [ContratacionController::class, 'store']);
    Route::get('/correo-simulado/{token}', [CorreoSimuladoController::class, 'show'])->where('token', '[A-Za-z0-9]{40}');

    Route::middleware('token')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
        Route::get('/perfil', [PerfilController::class, 'show']);
        Route::put('/perfil', [PerfilController::class, 'actualizar']);
        Route::post('/primer-ingreso', [PerfilController::class, 'primerIngreso']);
    });

    Route::prefix('interno')->group(function () {
        Route::post('/tokens/validar', [InternoController::class, 'validar']);
        Route::post('/tokens/dispositivo', [InternoController::class, 'dispositivo']);
        Route::get('/usuarios/{id}', [InternoController::class, 'usuario'])->whereNumber('id');
        Route::get('/cuentas/{cuenta_id}/administrador', [InternoController::class, 'administradorDeCuenta'])->whereNumber('cuenta_id');
        Route::post('/usuarios/{id}/desactivar', [InternoController::class, 'desactivar'])->whereNumber('id');
    });
});
