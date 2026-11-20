<?php

namespace App\Models;

use App\Models\Concerns\FechasEs;
use Illuminate\Database\Eloquent\Model;

class Cuenta extends Model
{
    use FechasEs;

    protected $table = 'cuentas';
    protected $fillable = ['administrador_usuario_id', 'plan', 'estado'];

    public function establecimientos()
    {
        return $this->hasMany(Establecimiento::class, 'cuenta_id');
    }

    public function empleados()
    {
        return $this->hasMany(Empleado::class, 'cuenta_id');
    }

    /** Límites del plan indicado (por defecto, el actual). null en un recurso = sin límite. */
    public function limites(?string $plan = null): array
    {
        return config('planes.' . ($plan ?? $this->plan), []);
    }

    /** Uso actual: estancias vigentes, lotes y sensores de esas estancias, y empleados activos. */
    public function uso(): array
    {
        $estancias = fn($q) => $q->where('cuenta_id', $this->id);

        return [
            'estancias' => Establecimiento::where('cuenta_id', $this->id)->count(),
            'lotes' => Lote::whereHas('establecimiento', $estancias)->count(),
            'sensores' => Dispositivo::whereHas('lote.establecimiento', $estancias)->count(),
            'empleados' => $this->empleados()->where('estado', 'activo')->count(),
        ];
    }

    public function limiteAlcanzado(string $recurso): bool
    {
        $limite = $this->limites()[$recurso] ?? null;

        return $limite !== null && $this->uso()[$recurso] >= $limite;
    }
}
