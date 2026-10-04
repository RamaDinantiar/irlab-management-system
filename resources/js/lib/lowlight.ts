import bash from 'highlight.js/lib/languages/bash';
import cpp from 'highlight.js/lib/languages/cpp';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import kotlin from 'highlight.js/lib/languages/kotlin';
import plaintext from 'highlight.js/lib/languages/plaintext';
import python from 'highlight.js/lib/languages/python';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import { createLowlight } from 'lowlight';

/**
 * Bahasa yang dipakai di praktikum (FR-AT-01). Hanya grammar ini yang dimuat
 * agar bundle halaman tugas tetap ringan (PRD 8.3).
 */
export const LANGUAGES = {
    bash,
    cpp,
    java,
    javascript,
    json,
    kotlin,
    plaintext,
    python,
    sql,
    typescript,
    xml,
};

export const lowlight = createLowlight(LANGUAGES);

export const CODE_LANGUAGES = [
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'cpp', label: 'C++' },
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'sql', label: 'SQL' },
    { value: 'kotlin', label: 'Kotlin' },
    { value: 'bash', label: 'Bash' },
    { value: 'json', label: 'JSON' },
    { value: 'plaintext', label: 'Teks biasa' },
];
