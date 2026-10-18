import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { schemaTypes } from "./schemas";

export default defineConfig({
  name: "saka",
  title: "SAKA Parfum",
  projectId: process.env.SANITY_STUDIO_PROJECT_ID ?? "",
  dataset: process.env.SANITY_STUDIO_DATASET ?? "production",
  plugins: [
    structureTool({
      structure: (S) =>
        S.list().title("Content").items([
          S.listItem().title("Store settings").id("siteSettings").child(S.document().schemaType("siteSettings").documentId("siteSettings")),
          S.documentTypeListItem("product").title("Perfumes"),
        ]),
    }),
  ],
  schema: { types: schemaTypes },
});
