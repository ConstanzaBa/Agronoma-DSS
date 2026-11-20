<?php

use App\Http\Controllers\ClimaController;
use App\Http\Controllers\CodigoEstanciaController;
use App\Http\Controllers\ContextoInternoController;
use App\Http\Controllers\CuentaController;
use App\Http\Controllers\CuentaInternaController;
use App\Http\Controllers\DispositivoController;
use App\Http\Controllers\EmpleadoController;
use App\Http\Controllers\EmpleadoInternoController;
use App\Http\Controllers\EstablecimientoController;
use App\Http\Controllers\EstablecimientoInternoController;
use App\Http\Controllers\LecturaController;
use App\Http\Controllers\LoteController;
use App\Http\Controllers\LluviaController;
use App\Http\Controllers\SimuladorController;
use App\Http\Controllers\TipoCultivoController;
use Illuminate\Support\Facades\Route;

Route::pattern('id', '[0-9]+');

Route::middleware('gateway')->group(function () {
    Route::get('/tipos-cultivo', [TipoCultivoController::class, 'index']);

    Route::middleware(['usuario', 'contexto'])->group(function () {
        Route::get('/establecimientos', [EstablecimientoController::class, 'index']);
        Route::get('/establecimientos/{id}', [EstablecimientoController::class, 'show']);
        Route::get('/establecimientos/{id}/lotes', [LoteController::class, 'index']);
        Route::get('/establecimientos/{id}/clima', [ClimaController::class, 'show']);

        Route::get('/lotes', [LoteController::class, 'todos']);
        Route::get('/lotes/{id}', [LoteController::class, 'show']);
        Route::get('/dispositivos/{id}', [DispositivoController::class, 'show']);

        // Solo el administrador de la cuenta: estancias, lotes y sensores.
        Route::middleware('admin.cuenta')->group(function () {
            Route::get('/cuenta', [CuentaController::class, 'show']);
            Route::put('/cuenta/plan', [CuentaController::class, 'cambiarPlan']);

            Route::post('/establecimientos/{id}/codigos', [CodigoEstanciaController::class, 'store']);
            Route::get('/codigos', [CodigoEstanciaController::class, 'index']);
            Route::delete('/codigos/{id}', [CodigoEstanciaController::class, 'destroy']);

            Route::get('/empleados', [EmpleadoController::class, 'index']);
            Route::get('/empleados/{id}', [EmpleadoController::class, 'show']);
            Route::delete('/empleados/{id}', [EmpleadoController::class, 'baja']);

            Route::post('/establecimientos', [EstablecimientoController::class, 'store']);
            Route::put('/establecimientos/{id}', [EstablecimientoController::class, 'update']);
            Route::delete('/establecimientos/{id}', [EstablecimientoController::class, 'destroy']);

            Route::post('/establecimientos/{id}/lotes', [LoteController::class, 'store']);
            Route::put('/lotes/{id}', [LoteController::class, 'update']);
            Route::delete('/lotes/{id}', [LoteController::class, 'destroy']);

            Route::post('/lotes/{id}/dispositivos', [DispositivoController::class, 'store']);
            Route::patch('/dispositivos/{id}', [DispositivoController::class, 'actualizar']);
            Route::post('/dispositivos/{id}/token', [DispositivoController::class, 'regenerarToken']);
        });

        Route::get('/lotes/{id}/lecturas', [LecturaController::class, 'index']);
        Route::get('/lotes/{id}/lluvia', [LluviaController::class, 'index']);
        Route::post('/lotes/{id}/lluvia', [LluviaController::class, 'store']);
    });

    Route::post('/lecturas', [LecturaController::class, 'store'])->middleware('sensor');
    Route::get('/interno/usuarios/{id}/contexto', [ContextoInternoController::class, 'mostrar']);
    Route::get('/interno/establecimientos/{id}/pertenece/{cuenta_id}', [EstablecimientoInternoController::class, 'pertenece'])->whereNumber('cuenta_id');
    Route::post('/interno/cuentas', [CuentaInternaController::class, 'store']);
    Route::post('/interno/empleados/registrar', [EmpleadoInternoController::class, 'registrar']);
    Route::delete('/interno/empleados/usuario/{id}/registro', [EmpleadoInternoController::class, 'compensar']);
    Route::delete('/interno/cuentas/administrador/{id}', [CuentaInternaController::class, 'compensar']);
    Route::post('/interno/simular/sensor', [SimuladorController::class, 'sensor']);
});
