<?php

namespace Database\Seeders;

use App\Models\Usuario;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        Usuario::updateOrCreate(
            ['correo' => 'admin@agronoma.site'],
            [
                'nombre' => 'Admin',
                'apellido' => 'AgroTech',
                'contrasena' => Hash::make((string) env('ADMIN_PASSWORD')),
                'rol' => 'admin',
                'profesion' => 'Otro',
                'activo' => true,
            ]
        );
    }
}
