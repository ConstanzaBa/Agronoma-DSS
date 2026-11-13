<?php

namespace App\Excepciones;

class EventoInvalido extends \RuntimeException
{
    public function __construct(public readonly array $errores, string $mensaje = 'Evento inválido')
    {
        parent::__construct($mensaje);
    }
}
