import { playerControlClass } from "./GamePlayer";

export interface SoundToggleButtonProps {
  on: boolean;
  label: string;
  onToggle: () => void;
}

/** Bouton « son » de la barre du lecteur : haut-parleur avec ondes quand le son est actif, barré sinon. */
export function SoundToggleButton({ on, label, onToggle }: SoundToggleButtonProps) {
  return (
    <button type="button" className={playerControlClass} aria-pressed={on} aria-label={label} onClick={onToggle}>
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        <path d="M11 5 6 9H3v6h3l5 4V5Z" />
        {on ? <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /> : <path d="m16 9 5 6M21 9l-5 6" />}
      </svg>
      <span>{label}</span>
    </button>
  );
}
