<?php

use App\Http\Controllers\CotizacionController;
use App\Http\Controllers\DivisaController;
use App\Http\Controllers\IndiceVentaController;
use App\Http\Controllers\InsumoController;
use App\Http\Controllers\InternoController;
use App\Http\Controllers\MargenController;
use App\Http\Controllers\SupuestoController;
use App\Http\Controllers\WebhookController;
use Illuminate\Support\Facades\Route;

Route::pattern('tipo_cultivo_id', '[0-9]+');
Route::pattern('silo_id', '[0-9]+');

Route::middleware('gateway')->group(function () {
    Route::middleware('usuario')->group(function () {
        Route::get('/cotizaciones', [CotizacionController::class, 'index']);
        Route::get('/cotizaciones/ultima', [CotizacionController::class, 'ultima']);
        Route::get('/divisas', [DivisaController::class, 'index']);
        Route::get('/divisas/ultima', [DivisaController::class, 'ultima']);
        Route::get('/insumos', [InsumoController::class, 'index']);

        Route::get('/supuestos-margen/{tipo_cultivo_id}', [SupuestoController::class, 'show']);
        Route::put('/supuestos-margen/{tipo_cultivo_id}', [SupuestoController::class, 'update']);
        Route::get('/margen/{tipo_cultivo_id}', [MargenController::class, 'show']);

        Route::get('/silos/{silo_id}/indice-venta', [IndiceVentaController::class, 'show']);
        Route::get('/silos/{silo_id}/indice-venta/historial', [IndiceVentaController::class, 'historial']);

        Route::middleware('admin')->group(function () {
            Route::post('/cotizaciones', [CotizacionController::class, 'store']);
            Route::post('/divisas', [DivisaController::class, 'store']);
            Route::post('/insumos', [InsumoController::class, 'store']);
        });
    });

    Route::post('/interno/actualizar-precios', [InternoController::class, 'actualizarPrecios']);
    Route::post('/interno/simular/webhook-cotizacion', [InternoController::class, 'simularWebhook']);
});

// Sin X-Gateway-Secret: lo llama un tercero y se protege con la firma HMAC.
Route::post('/webhooks/cotizaciones', [WebhookController::class, 'cotizaciones']);
