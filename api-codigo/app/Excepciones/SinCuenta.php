<?php

namespace App\Excepciones;

/** Campo informó que el usuario autenticado no pertenece a ninguna cuenta (o ya no tiene acceso). */
class SinCuenta extends \RuntimeException {}
