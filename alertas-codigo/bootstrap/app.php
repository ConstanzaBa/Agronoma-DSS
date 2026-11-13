<?php

use App\Http\Middleware\ProcesarColaOcasional;
use App\Http\Middleware\RequiereAdmin;
use App\Http\Middleware\RequiereUsuario;
use App\Http\Middleware\VerificarGatewaySecret;
use App\Support\Respuesta;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
        apiPrefix: 'api/v1',
        commands: __DIR__ . '/../routes/console.php',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'gateway' => VerificarGatewaySecret::class,
            'usuario' => RequiereUsuario::class,
            'admin' => RequiereAdmin::class,
        ]);

        $middleware->appendToGroup('api', ProcesarColaOcasional::class);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->shouldRenderJsonWhen(fn() => true);

        $exceptions->render(fn(ValidationException $e) => Respuesta::error('validacion', 'Datos inválidos', 422, $e->errors()));
        $exceptions->render(fn(ModelNotFoundException $e) => Respuesta::error('no_encontrado', 'Recurso inexistente', 404));
        $exceptions->render(fn(NotFoundHttpException $e) => Respuesta::error('no_encontrado', 'Recurso inexistente', 404));
    })->create();
