import { defineField, defineType } from "sanity";

export const siteSettings = defineType({
  name: "siteSettings",
  title: "Store settings",
  type: "document",
  fields: [
    defineField({ name: "storeName", type: "string", validation: (r) => r.required() }),
    defineField({ name: "address", type: "text", rows: 2, validation: (r) => r.required() }),
    defineField({
      name: "hours",
      type: "array",
      of: [{ type: "object", fields: [
        defineField({ name: "days", type: "string" }),
        defineField({ name: "open", type: "string" }),
        defineField({ name: "close", type: "string" }),
      ] }],
    }),
    defineField({ name: "phone", type: "string" }),
    defineField({ name: "mapUrl", title: "Google Maps link", type: "url", validation: (r) => r.required() }),
    defineField({
      name: "socialLinks",
      type: "array",
      of: [{ type: "object", fields: [
        defineField({ name: "label", type: "string", description: "Instagram, Facebook or Telegram" }),
        defineField({ name: "url", type: "url" }),
      ] }],
    }),
    defineField({ name: "stockUpdatedAt", title: "Stock last checked", type: "datetime" }),
  ],
});
