<?php

namespace App\Notifications;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Notifikasi in-app (lonceng) — PRD 4.x "Notifikasi". Email hanya untuk
 * tenggat H-1 (A8); reset password memakai notifikasi bawaan Fortify.
 */
class LabNotification extends Notification
{
    use Queueable;

    public function __construct(
        public readonly string $kind,
        public readonly string $title,
        public readonly string $body,
        public readonly ?string $url = null,
        public readonly bool $mail = false,
    ) {}

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return $this->mail ? ['database', 'mail'] : ['database'];
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(User $notifiable): array
    {
        return ['kind' => $this->kind, 'title' => $this->title, 'body' => $this->body, 'url' => $this->url];
    }

    public function toMail(User $notifiable): MailMessage
    {
        $message = (new MailMessage)->subject($this->title)->greeting("Halo, {$notifiable->name}")->line($this->body);

        return $this->url ? $message->action('Buka IR Lab', url($this->url)) : $message;
    }
}
