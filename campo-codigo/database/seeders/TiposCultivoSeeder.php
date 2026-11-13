<?php

namespace Database\Seeders;

use App\Models\TipoCultivo;
use Illuminate\Database\Seeder;

class TiposCultivoSeeder extends Seeder
{
    public function run(): void
    {
        // [nombre, limite_humedad_pct, dias_almacenamiento_seguro]
        // dias_almacenamiento_seguro queda en null hasta que lo definas.
        $catalogo = [
            ['soja', 13.5, null],
            ['maíz', 14.5, null],
            ['trigo', 14.0, null],   // VERIFICAR contra la norma
            ['girasol', 11.0, null], // base de humedad; la tolerancia de recibo es 14
            ['vid', null, null],
            ['frutales', null, null],
        ];

        foreach ($catalogo as [$nombre, $limite, $dias]) {
            TipoCultivo::updateOrCreate(
                ['nombre' => $nombre],
                ['limite_humedad_pct' => $limite, 'dias_almacenamiento_seguro' => $dias]
            );
        }
    }
}
