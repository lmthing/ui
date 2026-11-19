type Props = {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Let a long list of options wrap onto several rows. */
  wrap?: boolean;
};

/** A segmented control: one choice from a short list, as radios. */
export function Segmented({ label, value, options, onChange, disabled, wrap }: Props) {
  return (
    <div className={`seg2 ${wrap ? "multi" : ""}`} role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={option === value}
          disabled={disabled}
          onClick={() => onChange(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
