export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
        <circle cx="16" cy="16" r="16" fill="#1f5f3a" />
        <path d="M16 25V14" stroke="#e9dcc0" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M16 14c-1.5-4-5-5.5-9-5 2 1 4.5 2.5 5.5 5M16 14c1.5-4 5-5.5 9-5-2 1-4.5 2.5-5.5 5M16 14c-3-1-6 0-8 3 2.5-.5 5-.5 7 .5M16 14c3-1 6 0 8 3-2.5-.5-5-.5-7 .5" stroke="#e9dcc0" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <circle cx="14.5" cy="15.5" r="1.4" fill="#b5652e" />
        <circle cx="17.5" cy="15.5" r="1.4" fill="#b5652e" />
      </svg>
      <span className="text-base tracking-tight sm:text-lg">CoConnect</span>
    </span>
  );
}
