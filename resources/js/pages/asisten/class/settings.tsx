import { Form } from '@inertiajs/react';
import ClassDetailController from '@/actions/App/Http/Controllers/Asisten/ClassDetailController';
import { ClassDetailLayout } from '@/components/classes/class-detail-layout';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import type { ClassRow } from '@/types';

/** Asisten › detail kelas › Pengaturan (FR-AC-05). Token & Lock ada di header. */
export default function ClassSettings({
    klass,
    seatContractOpen,
}: {
    klass: ClassRow;
    seatContractOpen: boolean;
}) {
    return (
        <ClassDetailLayout klass={klass} title="Pengaturan">
            <Form
                {...ClassDetailController.updateSettings.form(klass.id)}
                options={{ preserveScroll: true }}
                className="grid max-w-xl gap-6 border bg-card p-6"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-2">
                            <Label htmlFor="settings-quota">
                                Kuota praktikan
                            </Label>
                            <Input
                                id="settings-quota"
                                name="quota"
                                type="number"
                                min={Math.max(1, klass.membersCount)}
                                max={200}
                                defaultValue={klass.quota}
                                className="w-32"
                                disabled={!klass.canEdit}
                            />
                            <p className="text-xs text-muted-foreground">
                                Kelas terkunci otomatis saat jumlah anggota
                                mencapai kuota.
                            </p>
                            <InputError message={errors.quota} />
                        </div>
                        <div className="flex items-start gap-3">
                            <Checkbox
                                id="settings-seat"
                                name="seat_contract_open"
                                value="1"
                                defaultChecked={seatContractOpen}
                                disabled={!klass.canEdit}
                            />
                            <div className="grid gap-1">
                                <Label htmlFor="settings-seat">
                                    Buka periode kontrak kursi
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    Praktikan hanya dapat memilih kursi selama
                                    periode ini dibuka (FR-PST-04).
                                </p>
                            </div>
                        </div>
                        {klass.canEdit && (
                            <Button
                                type="submit"
                                className="w-fit"
                                disabled={processing}
                            >
                                {processing && <Spinner />} Simpan Pengaturan
                            </Button>
                        )}
                    </>
                )}
            </Form>
        </ClassDetailLayout>
    );
}
