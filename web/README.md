# Sổ Vật Tư Web

Giao diện Next.js dùng shadcn/ui, chạy song song với Expo mobile và dùng chung Express API, Better Auth, database.

## Chạy tại máy phát triển

1. Chạy backend: `pnpm server` (cổng mặc định 4000).
2. Chạy web: `pnpm web` (cổng 3000).
3. Mở `http://localhost:3000`, đăng nhập bằng tài khoản nội bộ hiện có.

Nếu backend ở URL khác, đặt `MATERIAL_API_URL` cho tiến trình web. Proxy Next.js đọc biến này lúc chạy và chuyển `/api/*` sang backend, nên trình duyệt chỉ gọi cùng origin web. Không đặt URL này trong source và không dùng `EXPO_PUBLIC_API_URL` của mobile cho web.

## Chức năng

- `site`: tổng quan, tạo đơn vật tư, theo dõi đơn, tổng hợp công trình, đối chiếu, thông báo.
- `accountant`: tổng quan, đơn vật tư, tổng hợp công trình, đối chiếu, thống kê và xuất CSV, thông báo.
- `admin`: toàn bộ chức năng trên, duyệt/từ chối đơn, quản lý công trình/vật tư/đơn vị cung cấp/dự toán/thành viên và nhật ký.

Phân quyền và dữ liệu được kiểm tra bởi Express API. Web ẩn các màn hình không thuộc vai trò tương ứng.

## Kiểm tra và triển khai

```powershell
pnpm web:typecheck
pnpm web:build
pnpm --dir server typecheck
```

Dockerfile ở `web/Dockerfile` dùng build context là **thư mục gốc repository**. Trong Dokploy, đặt `MATERIAL_API_URL` cho service web là URL nội bộ `http://material-api-4fsd6i:4000`. Expose web cổng 3000. Production mặc định dùng public origin `https://material.apps.neooi.com`; có thể ghi đè bằng `MATERIAL_WEB_URL` nếu đổi domain. Thêm public origin của web vào `CORS_ORIGINS` của backend để Better Auth chấp nhận đăng nhập; cho môi trường local, `localhost:3000` và `127.0.0.1:3000` đã được cho phép. Cấu hình `APP_URL` thành URL web khi muốn email mời thành viên trỏ đến web.

Production mặc định tin cậy `material.apps.neooi.com` và cho phép origin HTTPS này. Có thể ghi đè bằng `BETTER_AUTH_ALLOWED_HOSTS` và `CORS_ORIGINS` nếu đổi domain. Better Auth dùng hostname đã được allowlist để tạo callback; proxy web tự ghi đè `X-Forwarded-Host` và `X-Forwarded-Proto` và không chuyển tiếp hai header này từ trình duyệt.

Trong Dokploy, web và backend nằm trong cùng project production cùng PostgreSQL hiện hữu. Web dùng Dockerfile `web/Dockerfile`, cổng `3000`, health check `GET /health`; backend dùng `server/Dockerfile`, cổng `4000`. Không còn quy trình phát hành mobile.

Backend cần persistent volume gắn vào `/app/uploads` để lưu ảnh và PDF xác nhận nhận hàng. Đặt `UPLOAD_DIR=/app/uploads/order-proofs`; không phục vụ thư mục này công khai vì chứng từ được tải qua API có kiểm tra phiên đăng nhập và quyền xem đơn.

Production được triển khai tại `https://material.apps.neooi.com` và dùng backend/database trong cùng project Dokploy. Hệ thống hiện vận hành theo chế độ web-only; source Expo được giữ lại trong repository để tham chiếu nhưng không còn nằm trong quy trình phát hành.

Đăng nhập email/mật khẩu dùng Better Auth. Với Google OAuth, Google Cloud phải có callback `https://material.apps.neooi.com/api/auth/callback/google`.
