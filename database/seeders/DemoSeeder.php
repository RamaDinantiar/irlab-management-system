<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use RuntimeException;

/**
 * Seeder data contoh (akun demo berkata sandi "password"): hanya boleh jalan di
 * lingkungan local/testing, termasuk saat dipanggil langsung dengan --class.
 */
abstract class DemoSeeder extends Seeder
{
    /**
     * @param  array<string, mixed>  $parameters
     */
    public function __invoke(array $parameters = [])
    {
        if (! app()->environment(['local', 'testing'])) {
            throw new RuntimeException(static::class.' berisi data & akun demo dan hanya boleh dijalankan di APP_ENV=local.');
        }

        return parent::__invoke($parameters);
    }
}
