/** Placeholder shop details until the owner sends the real ones. Edit here, nowhere else. */
export const STORE = {
  name: "SAKA Parfum",
  address: "12 Sample Street, Phnom Penh",
  /** Shown beside the map pin in the header. */
  city: "Phnom Penh",
  hours: [{ days: "Wednesday to Monday", open: "12:45", close: "19:00" }],
  phone: "+855 12 000 000",
  mapUrl: "https://maps.app.goo.gl/sample",
  /** Placeholder invite link until the owner creates the customer group. */
  telegramGroupUrl: "https://t.me/sakaparfum",
  socialLinks: [{ label: "Instagram", url: "https://instagram.com/sakaparfum" }],
};

const digits = STORE.phone.replace(/[^\d+]/g, "");
export const PHONE_HREF = `tel:${digits}`;
/** Telegram opens a chat by phone number, so the shop phone doubles as its Telegram contact. */
export const TELEGRAM_HREF = `https://t.me/${digits}`;
/** One line per opening period, for example "Wednesday to Monday, 12:45 to 19:00". */
export const HOURS = STORE.hours.map(({ days, open, close }) => `${days}, ${open} to ${close}`);
