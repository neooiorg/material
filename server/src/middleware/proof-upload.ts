import { mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import multer from "multer";
import { config } from "../config.js";

const storage = multer.diskStorage({
  destination(_request, _file, callback) {
    mkdirSync(config.uploadDir, { recursive: true });
    callback(null, config.uploadDir);
  },
  filename(_request, _file, callback) {
    callback(null, randomUUID());
  },
});

export const uploadOrderProofs = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 10 },
}).array("files", 10);
