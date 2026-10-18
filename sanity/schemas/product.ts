import { defineField, defineType } from "sanity";
import { LABELS, OCCASIONS, SCENT_FAMILIES, SIZES_ML, VIBES } from "../../src/lib/taxonomy";

const options = (values: readonly string[]) => ({
  list: values.map((value) => ({ value, title: LABELS[value] })),
});

const notes = (name: string, title: string) =>
  defineField({ name, title, type: "array", of: [{ type: "string" }], validation: (r) => r.required().min(1).max(5) });

const tags = (name: string, title: string, values: readonly string[], required = false) =>
  defineField({
    name,
    title,
    type: "array",
    of: [{ type: "string" }],
    options: options(values),
    validation: (r) => (required ? r.required().min(1) : r),
  });

export const product = defineType({
  name: "product",
  title: "Perfume",
  type: "document",
  fields: [
    defineField({ name: "name", type: "string", validation: (r) => r.required().max(60) }),
    defineField({ name: "slug", type: "slug", options: { source: "name" }, validation: (r) => r.required() }),
    defineField({ name: "description", type: "text", rows: 3, validation: (r) => r.required().max(160) }),
    notes("notesTop", "Top notes"),
    notes("notesHeart", "Heart notes"),
    notes("notesBase", "Base notes"),
    tags("scentFamily", "Scent family", SCENT_FAMILIES, true),
    tags("vibes", "Vibes", VIBES),
    tags("occasions", "Occasions", OCCASIONS),
    defineField({
      name: "image",
      type: "image",
      options: { hotspot: true },
      fields: [defineField({ name: "alt", type: "string", validation: (r) => r.required() })],
      validation: (r) => r.required(),
    }),
    defineField({
      name: "imageHover",
      title: "Hover image (optional)",
      type: "image",
      options: { hotspot: true },
      fields: [defineField({ name: "alt", type: "string" })],
      validation: (r) =>
        r.custom((value: { asset?: unknown; alt?: string } | undefined) =>
          !value?.asset || value.alt ? true : "Alt text is required when a hover image is set"),
    }),
    defineField({
      name: "sizes",
      type: "array",
      of: [
        {
          type: "object",
          name: "size",
          fields: [
            defineField({ name: "sizeMl", title: "Size (ml)", type: "number", options: { list: [...SIZES_ML] }, validation: (r) => r.required() }),
            defineField({ name: "priceUsd", title: "Price (USD)", type: "number", validation: (r) => r.required().positive().precision(2) }),
          ],
          preview: { select: { ml: "sizeMl", usd: "priceUsd" }, prepare: ({ ml, usd }) => ({ title: `${ml}ml`, subtitle: `$${usd}` }) },
        },
      ],
      validation: (r) =>
        r.required().min(1).custom((sizes: { sizeMl?: number }[] | undefined) =>
          new Set(sizes?.map((s) => s.sizeMl)).size === (sizes?.length ?? 0) ? true : "Use each size once"),
    }),
    defineField({ name: "available", title: "Available", type: "boolean", initialValue: true, description: "Switch off when the perfume is out of stock." }),
    defineField({ name: "displayOrder", type: "number", initialValue: 100 }),
    defineField({ name: "isActive", title: "Show on site", type: "boolean", initialValue: true }),
  ],
  preview: { select: { title: "name", media: "image", available: "available" }, prepare: ({ title, media, available }) => ({ title, media, subtitle: available === false ? "Out of stock" : "Available" }) },
});
