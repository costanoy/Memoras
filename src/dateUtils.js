const MONTHS_ABBR = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MONTHS_FULL = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

export function fmtShort(ts) {
  const d = new Date(ts);
  return `${d.getDate()} ${MONTHS_ABBR[d.getMonth()]}`;
}

export function fmtFull(ts) {
  const d = new Date(ts);
  return `${d.getDate()} de ${MONTHS_FULL[d.getMonth()]} de ${d.getFullYear()}`;
}

export function fmtTime(ts) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** "jul" no ano atual, "jul 2025" em anos anteriores — rótulo da timeline. */
export function fmtMonthLabel(ts) {
  const d = new Date(ts);
  const abbr = MONTHS_ABBR[d.getMonth()];
  return d.getFullYear() === new Date().getFullYear() ? abbr : `${abbr} ${d.getFullYear()}`;
}
