<?php

namespace App\Models;

use App\Models\Concerns\FechasEs;
use Illuminate\Database\Eloquent\Model;

class CodigoEstancia extends Model
{
    use FechasEs;

    // Sin caracteres ambiguos (0/O, 1/I). 12 símbolos de 32 ≈ 60 bits de entropía.
    private const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    protected $table = 'codigos_estancia';
    protected $fillable = ['cuenta_id', 'establecimiento_id', 'codigo', 'estado', 'empleado_id', 'usado_en'];
    protected $casts = ['usado_en' => 'datetime'];

    public static function generar(): string
    {
        $texto = '';

        for ($i = 0; $i < 12; $i++) {
            $texto .= self::ALFABETO[random_int(0, strlen(self::ALFABETO) - 1)];
        }

        return 'AGR-' . substr($texto, 0, 4) . '-' . substr($texto, 4, 4) . '-' . substr($texto, 8, 4);
    }

    /** Admite minúsculas y espacios al tipear. */
    public static function normalizar(string $codigo): string
    {
        return strtoupper(trim($codigo));
    }
}
