/** Kontrak data denah — app/Support/Seats/{RoomLayout,SeatMapData}.php. */

export type SeatCellType = 'seat' | 'assistant_desk' | 'aisle' | 'disabled';

export type SeatCell = {
    id: number;
    row: number;
    col: number;
    type: SeatCellType;
    label: string | null;
};

export type RoomLayout = {
    id: number;
    name: string;
    rows: number;
    cols: number;
    cells: SeatCell[];
};

export type SeatOccupant = {
    seatId: number;
    contractId: number | null;
    name: string;
    nim: string;
    major: string | null;
    mine: boolean;
};

export type SeatMapPayload = {
    layout: RoomLayout;
    occupants: SeatOccupant[];
};

export type SeatClassSummary = {
    id: number;
    course: string;
    code: string;
    credits: number;
    className: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    room: string | null;
    assistants: string[];
    contractOpen: boolean;
};
