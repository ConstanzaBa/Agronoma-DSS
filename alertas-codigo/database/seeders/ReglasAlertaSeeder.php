<?php

namespace Database\Seeders;

use App\Models\ReglaAlerta;
use Illuminate\Database\Seeder;

class ReglasAlertaSeeder extends Seeder
{
    public function run(): void
    {
        // [tipo, severidad, parametros]  (los umbrales son una propuesta: ajustalos)
        $reglas = [
            ['moisture', 'critical', ['umbral_menor_pct' => 15]],
            ['moisture', 'warning', ['umbral_menor_pct' => 25]],
            ['no_rain', 'warning', ['dias_minimos' => 15]],
            ['silo_temp', 'critical', ['margen_c' => 5]],     // más de 5 °C sobre el límite del silo
            ['silo_temp', 'warning', ['margen_c' => 0]],      // sobre el límite
            ['market', 'info', ['veredictos' => ['sell']]],
            ['price_target', 'info', ['enfriamiento_horas' => 24]],
        ];

        foreach ($reglas as [$tipo, $severidad, $parametros]) {
            ReglaAlerta::updateOrCreate(
                ['tipo' => $tipo, 'severidad' => $severidad],
                ['parametros' => $parametros, 'activa' => true]
            );
        }
    }
}
