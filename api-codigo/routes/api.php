<?php

use App\Http\Controllers\EstadoController;
use App\Http\Controllers\ProxyController;
use App\Http\Controllers\ResumenController;
use App\Http\Controllers\SaludController;
use Illuminate\Support\Facades\Route;

Route::get('/health/live', [SaludController::class, 'live']);
Route::get('/health/ready', [SaludController::class, 'ready']);

// Las únicas rutas públicas (sección 3.4).
Route::post('/v1/auth/registro', [ProxyController::class, 'publico'])->defaults('ruta', 'registro')->middleware('limitar:publico');
Route::post('/v1/auth/contratacion', [ProxyController::class, 'publico'])->defaults('ruta', 'contratacion')->middleware('limitar:publico');
Route::get('/v1/auth/correo-simulado/{token}', [ProxyController::class, 'correoSimulado'])->where('token', '[A-Za-z0-9]{40}')->middleware('limitar:publico');
Route::post('/v1/auth/login', [ProxyController::class, 'publico'])->defaults('ruta', 'login')->middleware('limitar:publico');

Route::middleware(['autenticar', 'primer_ingreso', 'limitar:usuario'])->group(function () {
    Route::get('/v1/resumen', [ResumenController::class, 'show']);
    Route::get('/v1/estado', [EstadoController::class, 'show'])->middleware('admin');

    Route::any('/v1/{servicio}/{ruta?}', [ProxyController::class, 'reenviar'])->where('ruta', '.*');
});
