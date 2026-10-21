<?php

namespace App\Notifications;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * US-D04-1: email aktivasi berisi password sementara (akun baru / reset Admin).
 * Praktikan wajib mengganti password saat login pertama (FR-AUTH-05).
 */
class AccountCredentialsNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly string $temporaryPassword,
        private readonly bool $isReset = false,
    ) {
        $this->afterCommit();
    }

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(User $notifiable): MailMessage
    {
        $login = $notifiable->nim ?? $notifiable->email;

        return (new MailMessage)
            ->subject($this->isReset ? 'Password sementara baru — Portal IR Lab' : 'Akun Portal IR Lab Anda')
            ->greeting("Halo, {$notifiable->name}!")
            ->line($this->isReset
                ? 'Admin lab mengatur ulang password akun Anda.'
                : 'Akun Anda di Portal Laboratorium Information Retrieval telah dibuat.')
            ->line("NIM/Email: **{$login}**")
            ->line("Password sementara: **{$this->temporaryPassword}**")
            ->action('Masuk ke Portal', route('login'))
            ->line('Demi keamanan, Anda wajib membuat password baru saat pertama kali masuk.');
    }
}
