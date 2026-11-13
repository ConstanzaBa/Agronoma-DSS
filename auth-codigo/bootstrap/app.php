<?php

use App\Http\Middleware\AutenticarToken;
use App\Http\Middleware\VerificarGatewaySecret;
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
            'token' => AutenticarToken::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->shouldRenderJsonWhen(fn() => true);

        $exceptions->render(function (ValidationException $e) {
            return response()->json([
                'codigo' => 'validacion',
                'mensaje' => 'Datos inválidos',
                'detalles' => $e->errors(),
            ], 422);
        });

        $exceptions->render(function (NotFoundHttpException $e) {
            return response()->json([
                'codigo' => 'no_encontrado',
                'mensaje' => 'Recurso inexistente',
            ], 404);
        });
    })->create();
