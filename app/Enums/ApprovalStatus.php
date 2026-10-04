<?php

namespace App\Enums;

/**
 * Status persetujuan Mata Kuliah/Kelas yang diajukan Asisten (FR-ADM-03).
 */
enum ApprovalStatus: string
{
    case Pending = 'pending';
    case Approved = 'approved';
    case Rejected = 'rejected';
}
