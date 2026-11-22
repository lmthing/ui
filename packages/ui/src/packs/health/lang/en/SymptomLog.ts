export const words = {
  symptomLevel: (value: string, max: string) => `${value}/${max}`,
  symptomSeverity: (label: string, level: string) => `${label} · ${level}`,
};
