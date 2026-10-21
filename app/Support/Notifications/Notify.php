<?php

namespace App\Support\Notifications;

use App\Enums\Role;
use App\Models\User;
use App\Notifications\LabNotification;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Notification;

/**
 * Pintasan mengirim LabNotification ke sekumpulan pengguna aktif.
 */
class Notify
{
    /**
     * @param  iterable<User>|User|array<int, int>  $users
     */
    public static function send(iterable|User $users, string $kind, string $title, string $body, ?string $url = null, bool $mail = false): void
    {
        $recipients = self::resolve($users);

        if ($recipients->isNotEmpty()) {
            Notification::send($recipients, new LabNotification($kind, $title, $body, $url, $mail));
        }
    }

    public static function admins(string $kind, string $title, string $body, ?string $url = null): void
    {
        self::send(User::where('role', Role::Admin)->where('is_active', true)->get(), $kind, $title, $body, $url);
    }

    /**
     * @param  iterable<User>|User|array<int, int>  $users
     * @return Collection<int, User>
     */
    private static function resolve(iterable|User $users): Collection
    {
        if ($users instanceof User) {
            return collect([$users]);
        }

        $items = collect($users);

        return $items->every(fn ($item) => is_int($item))
            ? User::whereKey($items->unique()->all())->where('is_active', true)->get()
            : $items->filter(fn ($u) => $u instanceof User && $u->is_active)->values();
    }
}
