<?php

namespace App\Enums;

enum SemesterStatus: string
{
    case Draft = 'draft';
    case Active = 'active';
    case Archived = 'archived';
}
