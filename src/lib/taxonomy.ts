export const SCENT_FAMILIES = ["fresh", "woody", "oriental", "aromatic"] as const;
export const VIBES = ["calm", "fresh", "warm", "bold", "romantic", "earthy"] as const;
export const OCCASIONS = ["everyday", "work", "evening", "date_night", "ceremony"] as const;
export const SIZES_ML = [10, 20, 50] as const;

export type ScentFamily = (typeof SCENT_FAMILIES)[number];
export type Vibe = (typeof VIBES)[number];
export type Occasion = (typeof OCCASIONS)[number];
export type SizeMl = (typeof SIZES_ML)[number];

export const LABELS: Record<string, string> = {
  fresh: "Fresh",
  woody: "Woody",
  oriental: "Oriental",
  aromatic: "Aromatic",
  calm: "Calm",
  warm: "Warm",
  bold: "Bold",
  romantic: "Romantic",
  earthy: "Earthy",
  everyday: "Everyday",
  work: "Work",
  evening: "Evening",
  date_night: "Date night",
  ceremony: "Ceremony",
};
