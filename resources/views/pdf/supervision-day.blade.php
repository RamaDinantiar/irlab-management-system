{{-- US-A04-3: tata letak cetak berita acara lab (kop, tabel, kolom tanda tangan). --}}
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<title>Berita Acara Pengawasan</title>
<style>
    @page { margin: 28px 32px; }
    body { font-family: Helvetica, Arial, sans-serif; font-size: 10px; color: #0f172a; }
    .kop { border-bottom: 3px double #123a52; padding-bottom: 8px; margin-bottom: 12px; }
    .kop table { width: 100%; }
    .logo { width: 46px; height: 46px; background: #146578; color: #fff; font-weight: bold; font-size: 20px; text-align: center; line-height: 46px; }
    .kop h1 { font-size: 15px; margin: 0; color: #123a52; }
    .kop p { margin: 2px 0 0; color: #475569; }
    h2 { text-align: center; font-size: 12px; margin: 6px 0 2px; letter-spacing: .5px; }
    .meta { text-align: center; margin-bottom: 10px; color: #334155; }
    table.data { width: 100%; border-collapse: collapse; }
    table.data th, table.data td { border: 1px solid #94a3b8; padding: 5px 6px; vertical-align: top; }
    table.data th { background: #e5f4f9; font-size: 9px; text-transform: uppercase; }
    .sign { width: 100%; margin-top: 28px; }
    .sign td { width: 50%; text-align: center; vertical-align: top; }
    .line { margin: 52px auto 0; border-top: 1px solid #0f172a; width: 190px; padding-top: 3px; }
    .page-break { page-break-after: always; }
    .muted { color: #64748b; }
</style>
</head>
<body>
@foreach ($days as $date => $reports)
    <div class="kop">
        <table><tr>
            <td style="width:56px"><div class="logo">IR</div></td>
            <td>
                <h1>{{ \App\Models\Setting::value('pdf_header_title') }}</h1>
                <p>{{ \App\Models\Setting::value('pdf_header_subtitle') }} · {{ $semester }}</p>
            </td>
        </tr></table>
    </div>

    <h2>BERITA ACARA PENGAWASAN PRAKTIKUM</h2>
    <p class="meta">{{ \Carbon\Carbon::parse($date)->locale('id')->translatedFormat('l, d F Y') }} · {{ $reports->count() }} shift</p>

    <table class="data">
        <thead>
            <tr>
                <th style="width:18px">No</th>
                <th style="width:62px">Jam</th>
                <th>Mata Kuliah / Kegiatan</th>
                <th style="width:48px">Ruang</th>
                <th>Asisten Jaga</th>
                <th style="width:34px">Hadir</th>
                <th style="width:54px">Kondisi Lab</th>
                <th>Materi &amp; Catatan Kejadian</th>
            </tr>
        </thead>
        <tbody>
        @foreach ($reports as $i => $report)
            <tr>
                <td>{{ $i + 1 }}</td>
                <td>{{ substr($report->start_time, 0, 5) }}–{{ substr($report->end_time, 0, 5) }}</td>
                <td>
                    @if ($report->labClass)
                        <strong>{{ $report->labClass->course->name }}</strong><br>{{ $report->labClass->name }} <span class="muted">({{ $report->labClass->course->code }})</span>
                    @else
                        <strong>{{ $report->activity }}</strong>
                    @endif
                </td>
                <td>{{ $report->room?->name ?? '—' }}</td>
                <td>
                    @foreach ($report->assistants as $assistant)
                        {{ $assistant->name }}@if ($assistant->pivot->position === 1) (PJ)@endif<br>
                    @endforeach
                </td>
                <td style="text-align:center">{{ $report->present_count }}</td>
                <td>{{ \App\Models\SupervisionReport::CONDITIONS[$report->lab_condition] ?? $report->lab_condition }}</td>
                <td>
                    @if ($report->material)<strong>{{ $report->material }}</strong><br>@endif
                    {{ $report->notes }}
                </td>
            </tr>
        @endforeach
        </tbody>
    </table>

    <table class="sign">
        <tr>
            <td>
                Asisten Penanggung Jawab
                <div class="line">{{ $reports->first()->user->name }}</div>
            </td>
            <td>
                Diverifikasi Sekretaris Lab
                <div class="line">{{ $reports->first()->verifier?->name ?? '..............................' }}</div>
            </td>
        </tr>
    </table>
    @unless ($loop->last)<div class="page-break"></div>@endunless
@endforeach
</body>
</html>
