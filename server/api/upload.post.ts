import { auth } from "!/lib/auth";
import { storage } from "!/lib/storage";
import { defineEventHandler, HTTPError } from "nitro/h3";
import { sanitizeFileName, validateFile } from "#/upload-config";

export default defineEventHandler(async ({ req }) => {
  const session = await auth.api.getSession({
    headers: req.headers,
  });

  if (!session) {
    throw new HTTPError({ statusCode: 401, message: "Unauthorized" });
  }

  const formData = await req.formData();
  const files = formData.getAll("file") as File[];

  if (!files || files.length === 0) {
    throw new HTTPError({ statusCode: 400, message: "No file uploaded" });
  }

  const results: { fileName: string; url: string }[] = [];

  for (const file of files) {
    if (file instanceof File) {
      // 校验文件大小和类型
      const validation = validateFile(file);
      if (!validation.valid) {
        throw new HTTPError({ statusCode: 400, message: validation.error });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const safeName = sanitizeFileName(file.name);
      const url = await storage.upload(buffer, safeName);
      results.push({ fileName: file.name, url });
    }
  }

  if (results.length === 0) {
    throw new HTTPError({ statusCode: 400, message: "No valid files found" });
  }

  return results;
});
