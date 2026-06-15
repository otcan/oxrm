export interface AvailabilityWindow {
  startsAt: Date;
  endsAt: Date;
}

export interface BusyBlock {
  startsAt: Date;
  endsAt: Date;
}

export function subtractBusyBlocks(windows: AvailabilityWindow[], busyBlocks: BusyBlock[]) {
  return windows.filter((window) =>
    busyBlocks.every((busy) => busy.endsAt <= window.startsAt || busy.startsAt >= window.endsAt)
  );
}

