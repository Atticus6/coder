import { storage } from "!/lib/storage";
import { defineEventHandler, HTTPError } from "nitro/h3";

export default defineEventHandler(async ({ req }) => {
  const formData = await req.formData();
  const files = formData.getAll("file") as File[];

  if (!files || files.length === 0) {
    throw new HTTPError({ statusCode: 400, message: "No file uploaded" });
  }

  const results: { fileName: string; url: string }[] = [];

  for (const file of files) {
    if (file instanceof File) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const url = await storage.upload(buffer, file.name);
      results.push({ fileName: file.name, url });
    }
  }

  if (results.length === 0) {
    throw new HTTPError({ statusCode: 400, message: "No valid files found" });
  }

  return results;
});
