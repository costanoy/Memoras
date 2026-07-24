export function NotebookIcon({ size = 56 }) {
  const height = Math.round(size * 1.25);
  return (
    <svg width={size} height={height} viewBox="0 0 56 70" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="56" height="70" rx="8" fill="#F97316" />
      <rect x="0" y="0" width="9" height="70" rx="8" fill="#D45A0C" />
      <rect x="34" y="-5" width="13" height="14" rx="3" fill="#D45A0C" />
      <rect x="36.5" y="1.5" width="8" height="7" rx="2" fill="#FCE3C8" />
    </svg>
  );
}
