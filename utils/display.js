export const displayString = v => {
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  if (Array.isArray(v)) {
    if (!v.length) return '';
    const f = v[0];
    if (typeof f === 'string' || typeof f === 'number') return v.join(', ');
    if (f?.url) return String(f.url);
    if (f?.title) return String(f.title);
    try {
      const js = JSON.stringify(v);
      if (js.length < 120) return js;
    } catch {}
    return '';
  }
  if (typeof v === 'object') {
    if (v._id) return displayString(v._id);
    if (v.$oid) return String(v.$oid);
    if (v.$numberInt) return String(v.$numberInt);
    if (v.$numberDouble) return String(v.$numberDouble);
    if (v.title) return String(v.title);
    if (v.name) return String(v.name);
    if (v.city) return displayString(v.city);
    if (v.url) return String(v.url);
    try {
      const js = JSON.stringify(v);
      if (js && js !== '{}' && js.length < 120) return js;
    } catch {}
    return '';
  }
  return String(v);
};

export const isMongoId = v => typeof v === 'string' && /^[a-f0-9]{24}$/i.test(v);

export const normalizeId = v => {
  if (!v) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'object') {
    if (v._id) return displayString(v._id);
    if (v.id) return displayString(v.id);
    if (v.$oid) return displayString(v.$oid);
  }
  return displayString(v);
};

export const getGuestName = r =>
  r?.booker_first_name ??
  r?.booker_name ??
  r?.guest_name ??
  r?.guestName ??
  r?.guest?.name ??
  r?.primary_guest_name ??
  r?.name ??
  'Guest';
