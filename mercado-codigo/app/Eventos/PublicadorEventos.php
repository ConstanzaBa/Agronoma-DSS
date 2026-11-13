<?php

namespace App\Eventos;

interface PublicadorEventos
{
    public function publicar(string $routingKey, array $evento): bool;
}
