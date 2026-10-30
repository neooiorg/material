import type { ErrorRequestHandler } from "express";
import { MulterError } from "multer";
import { HttpError } from "../lib/http-error.js";

export const errorHandler: ErrorRequestHandler = (
  error,
  _request,
  response,
  _next
) => {
  if (!(error instanceof HttpError)) console.error(error);
  const message = error instanceof Error ? error.message : "Lỗi máy chủ.";
  if (error instanceof MulterError) {
    const text = error.code === "LIMIT_FILE_SIZE"
      ? "Mỗi tệp không được vượt quá 10 MB."
      : error.code === "LIMIT_FILE_COUNT" || error.code === "LIMIT_UNEXPECTED_FILE"
        ? "Mỗi đơn chỉ được tải tối đa 10 tệp."
        : "Không thể tải tệp lên.";
    response.status(400).json({ error: text });
    return;
  }
  if (error instanceof HttpError) {
    response.status(error.status).json({ error: message });
    return;
  }
  const isConstraint = typeof error === "object" && error !== null && "code" in error;
  const status = isConstraint || message !== "Lỗi máy chủ." ? 400 : 500;
  response.status(status).json({ error: isConstraint ? "Không thể lưu dữ liệu do trùng hoặc đang được sử dụng." : message });
};
