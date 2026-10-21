<?php

namespace App\Notifications;

use App\Models\User;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Kode OTP 6 digit untuk mengatur ulang password (Lupa Password).
 */
class PasswordResetCodeNotification extends Notification
{
    public function __construct(
        private readonly string $code,
        private readonly int $minutes,
    ) {}

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(User $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject("{$this->code} adalah kode reset password Portal IR Lab")
            ->greeting("Halo, {$notifiable->name}!")
            ->line('Kami menerima permintaan untuk mengatur ulang password akun Portal IR Lab Anda. Masukkan kode berikut:')
            ->line("# {$this->code}")
            ->line("Kode berlaku {$this->minutes} menit dan hanya dapat dipakai sekali.")
            ->line('Jangan berikan kode ini kepada siapa pun, termasuk asisten lab. Jika Anda tidak meminta reset password, abaikan email ini; password Anda tidak berubah.');
    }
}
