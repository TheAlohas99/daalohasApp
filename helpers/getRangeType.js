import { addDays, isoOf } from '../utils/date';

export default function getRangeType(dateObj, reservationsForNight) {
  if (!reservationsForNight?.length) return null;
  const r = reservationsForNight[0];

  const start = r.check_in_date || r.checkin_date || r.checkInDate || r.start_date;
  const end   = r.check_out_date || r.checkout_date || r.checkOutDate || r.end_date;
  if (!start || !end) return null;

  const s = addDays(start, 0);
  const e = addDays(end, 0);
  const lastOccupied = addDays(e, -1);
  const isStart = isoOf(dateObj) === isoOf(s);
  const isLast  = isoOf(dateObj) === isoOf(lastOccupied);

  if (isStart && isLast) return 'single';
  if (isStart) return 'start';
  if (isLast)  return 'end';
  return 'middle';
}
