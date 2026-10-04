<?php

namespace App\Enums;

/**
 * Tiga peran tetap sistem (PRD Bagian 2). Satu akun hanya punya satu peran aktif.
 */
enum Role: string
{
    case Praktikan = 'praktikan';
    case Asisten = 'asisten';
    case Admin = 'admin';

    public function label(): string
    {
        return match ($this) {
            self::Praktikan => 'Praktikan',
            self::Asisten => 'Asisten Lab',
            self::Admin => 'Admin',
        };
    }

    /**
     * Dashboard tujuan setelah login (FR-AUTH-02).
     */
    public function dashboardRoute(): string
    {
        return $this->value.'.dashboard';
    }
}
