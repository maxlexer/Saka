export const SCENT_FAMILIES = ["floral", "woody", "citrus", "amber", "fresh_aquatic", "musk"] as const;
export const VIBES = ["calm", "fresh", "warm", "bold", "romantic", "earthy"] as const;
export const OCCASIONS = ["everyday", "work", "evening", "date_night", "ceremony", "gift"] as const;
export const SIZES_ML = [10, 20, 50] as const;

export type ScentFamily = (typeof SCENT_FAMILIES)[number];
export type Vibe = (typeof VIBES)[number];
export type Occasion = (typeof OCCASIONS)[number];
export type SizeMl = (typeof SIZES_ML)[number];

export const LABELS: Record<string, string> = {
  floral: "Floral",
  woody: "Woody",
  citrus: "Citrus",
  amber: "Amber",
  fresh_aquatic: "Fresh and aquatic",
  musk: "Musk",
  calm: "Calm",
  fresh: "Fresh",
  warm: "Warm",
  bold: "Bold",
  romantic: "Romantic",
  earthy: "Earthy",
  everyday: "Everyday",
  work: "Work",
  evening: "Evening",
  date_night: "Date night",
  ceremony: "Ceremony",
  gift: "Gift",
};
