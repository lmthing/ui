/** An on/off switch, for booleans and for including an optional field. */
export function Switch({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className="sw"
      onClick={() => onChange(!on)}
    >
      <i />
    </button>
  );
}
