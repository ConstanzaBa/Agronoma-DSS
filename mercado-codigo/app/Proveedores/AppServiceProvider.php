<?php

namespace App\Providers;

use App\Eventos\AlertasHttpPublicador;
use App\Eventos\PublicadorEventos;
use App\Eventos\RabbitPublicador;
use App\Proveedores\DolarApiDivisas;
use App\Proveedores\GranosArPrecios;
use App\Proveedores\ProveedorDivisas;
use App\Proveedores\ProveedorPrecios;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(PublicadorEventos::class, fn($app) => config('agrotech.cola_driver') === 'rabbitmq'
            ? $app->make(RabbitPublicador::class)
            : $app->make(AlertasHttpPublicador::class));

        $this->app->bind(ProveedorPrecios::class, GranosArPrecios::class);
        $this->app->bind(ProveedorDivisas::class, DolarApiDivisas::class);
    }

    public function boot(): void {}
}
