// src/components/ReservationSheet/utils.js
// import { addDays, getGuestName } from './utils';
import { getGuestName } from '../utils/display';
import { addDays } from '../utils/date';

export const diffNights = (start, end) => {
  if (!start || !end) return 0;
  const a = addDays(start, 0);
  const b = addDays(end, 0);
  return Math.max(0, Math.round((b - a) / (1000 * 60 * 60 * 24)));
};

export const fmtDate = d => {
  if (!d) return '—';
  try {
    const x = new Date(d);
    return x.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return String(d ?? '');
  }
};

export const fmtTime = d => {
  if (!d) return '';
  try {
    const x = new Date(d);
    const dd = String(x.getDate()).padStart(2, '0');
    const mon = x.toLocaleString(undefined, { month: 'short' });
    const hh = String(x.getHours()).padStart(2, '0');
    const mm = String(x.getMinutes()).padStart(2, '0');
    return `${dd} ${mon} • ${hh}:${mm}`;
  } catch {
    return String(d ?? '');
  }
};

export const num = v => {
  if (v == null) return null;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof v === 'object') {
    if (v.$numberDouble) return Number(v.$numberDouble);
    if (v.$numberInt) return Number(v.$numberInt);
  }
  return null;
};

export const money = (value, currencyGuess = 'INR') => {
  const n = num(value);
  if (n == null) return '—';
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currencyGuess,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `₹ ${Number(n).toFixed(2)}`;
  }
};

const toInt = v => {
  if (v == null) return 0;
  if (typeof v === 'object') {
    if (v.$numberInt != null) v = v.$numberInt;
    if (v.$numberDouble != null) v = v.$numberDouble;
  }
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : 0;
};

export const pick = {
  title: r =>
    r?.property_title ||
    r?.property?.title ||
    r?.property?.name ||
    r?.listing_title ||
    r?.title ||
    '',
  subtitle: r =>
    r?.unit_name ||
    r?.room_name ||
    r?.apartment ||
    r?.property?.internal_name ||
    r?.property?.id ||
    '',
  checkIn: r =>
    r?.check_in_date || r?.checkin_date || r?.checkInDate || r?.start_date,
  checkOut: r =>
    r?.check_out_date || r?.checkout_date || r?.checkOutDate || r?.end_date,

  guests: r => {
    const direct = toInt(
      r?.guests_count ?? r?.no_of_guests ?? r?.num_guests ?? r?.total_guests,
    );
    if (direct > 0) return direct;

    const adults = toInt(r?.adults ?? r?.adult_count ?? r?.adults_count);

    const childKeys = [
      'children',
      'children_count',
      'kids',
      'kids_count',
      'children05',
      'children0_5',
      'children_0_5',
      'children_05',
      'children612',
      'children6_12',
      'children_6_12',
      'infants',
      'infant_count',
      'babies',
      'baby_count',
    ];
    const children = childKeys.reduce((sum, k) => sum + toInt(r?.[k]), 0);

    const derived = adults + children;
    if (derived > 0) return derived;

    const pax = toInt(r?.pax);
    if (pax > 0) return pax;

    const arrLen = Array.isArray(r?.guests) ? r.guests.length : 0;
    return arrLen || 1;
  },

  totalAmount: r =>
    r?.total_amount ||
    r?.amount_total ||
    r?.grand_total ||
    r?.amount ||
    r?.base_amount ||
    r?.price_total ||
    null,
  currency: r =>
    r?.currency ||
    r?.currency_code ||
    r?.pricing_currency ||
    r?.rate_currency ||
    'INR',
  channel: r =>
    r?.channel || r?.channel_name || r?.source || r?.portal || r?.origin || '',
  createdAt: r =>
    r?.created_at ||
    r?.createdAt ||
    r?.booked_at ||
    r?.timestamp ||
    r?.booking_time,
  PendingAmount: r =>(r?.amount_pending) || '',

  // ✅ use your centralized util
  bookerName: r => getGuestName(r),

  phone: r =>
    r?.booker_mobile || r?.guest_phone || r?.guest?.phone || r?.contact || '',
  email: r => r?.booker_email || r?.guest_email || r?.guest?.email || '',
  paid: r => r?.amount_paid || r?.paid_amount || r?.payments_total || 0,
  reference: r =>
     r?.reservation_id || r?.booking_id || r?.reference || '',
  status: r => r?.reservation_status || r?.status || r?.booking_status || '',
};
