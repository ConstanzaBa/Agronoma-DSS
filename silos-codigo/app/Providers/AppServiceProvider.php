<?php

namespace App\Providers;

use App\Eventos\AlertasHttpPublicador;
use App\Eventos\PublicadorEventos;
use App\Eventos\RabbitPublicador;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(PublicadorEventos::class, fn($app) => config('agrotech.cola_driver') === 'rabbitmq'
            ? $app->make(RabbitPublicador::class)
            : $app->make(AlertasHttpPublicador::class));
    }

    public function boot(): void {}
}
