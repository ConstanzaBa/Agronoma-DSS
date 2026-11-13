<?php

use App\Http\Controllers\SaludController;
use Illuminate\Support\Facades\Route;

Route::get('/health/live', [SaludController::class, 'live']);
Route::get('/health/ready', [SaludController::class, 'ready']);
