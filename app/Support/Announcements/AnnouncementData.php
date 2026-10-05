<?php

namespace App\Support\Announcements;

use App\Models\Announcement;

/**
 * Bentuk data pengumuman untuk halaman React.
 */
class AnnouncementData
{
    /**
     * @return array<string, mixed>
     */
    public static function row(Announcement $a): array
    {
        $a->loadMissing(['labClass.course', 'author']);

        return [
            'id' => $a->id,
            'scope' => $a->scope,
            'classId' => $a->class_id,
            'className' => $a->labClass ? "{$a->labClass->course->name} · {$a->labClass->name}" : null,
            'title' => $a->title,
            'body' => $a->body,
            'pinned' => $a->pinned,
            'targetRoles' => $a->target_roles ?? [],
            'publishAt' => $a->publish_at->toIso8601String(),
            'expireAt' => $a->expire_at?->toIso8601String(),
            'status' => $a->publish_at->isFuture() ? 'scheduled' : ($a->expire_at?->isPast() ? 'expired' : 'live'),
            'author' => $a->author?->name,
            'publishedAt' => $a->publish_at->toIso8601String(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:150'],
            'body' => ['required', 'string', 'max:5000'],
            'pinned' => ['boolean'],
            'publish_at' => ['nullable', 'date'],
            'expire_at' => ['nullable', 'date', 'after:publish_at'],
        ];
    }
}
