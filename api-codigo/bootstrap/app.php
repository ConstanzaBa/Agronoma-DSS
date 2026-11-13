<?php

use App\Http\Middleware\AutenticarToken;
use App\Http\Middleware\Cors;
use App\Http\Middleware\IdSolicitud;
use App\Http\Middleware\LimitarPedidos;
use App\Http\Middleware\RequiereAdmin;
use App\Support\Respuesta;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__ . '/../routes/api.php',
        apiPrefix: '',
        commands: __DIR__ . '/../routes/console.php',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->prepend([Cors::class, IdSolicitud::class]);

        $middleware->alias([
            'autenticar' => AutenticarToken::class,
            'limitar' => LimitarPedidos::class,
            'admin' => RequiereAdmin::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->shouldRenderJsonWhen(fn() => true);

        $exceptions->render(fn(NotFoundHttpException $e) => Respuesta::error('no_encontrado', 'Recurso inexistente', 404));
    })->create();
