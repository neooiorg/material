# Material Web

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

Dockerfile ở `web/Dockerfile` dùng build context là **thư mục gốc repository**. Trong Dokploy, đặt `MATERIAL_API_URL` cho service web là URL backend mà container có thể truy cập, ví dụ URL nội bộ trong cùng Docker network hoặc URL HTTPS public của API. Expose web cổng 3000. Thêm public origin của web vào `CORS_ORIGINS` của backend để Better Auth chấp nhận đăng nhập; cho môi trường local, `localhost:3000` và `127.0.0.1:3000` đã được cho phép. Cấu hình `APP_URL` thành URL web khi muốn email mời thành viên trỏ đến web.

Để Google OAuth hoạt động đồng thời qua API mobile và proxy cùng-origin của web, đặt `BETTER_AUTH_ALLOWED_HOSTS` trên backend thành danh sách hostname API và web, không kèm protocol. Khi biến này có giá trị, Better Auth chỉ chấp nhận các hostname trong allowlist và dùng hostname của từng request để tạo callback. Proxy web tự ghi đè `X-Forwarded-Host` và `X-Forwarded-Proto`; không chuyển tiếp hai header này từ trình duyệt.

Trong Dokploy tạo application Dockerfile mới với build context là repository root, Dockerfile path `web/Dockerfile`, container port `3000` và health check `GET /health`. Bật HTTPS cho domain web. Giữ nguyên service backend đang phục vụ mobile; web chỉ cần trỏ `MATERIAL_API_URL` tới backend đó.

Web hiện được chuẩn bị để deploy riêng. Chưa có domain và cấu hình Dokploy cho service web trong repository; cần khai báo các giá trị đó ở môi trường triển khai trước khi phát hành public.

Đăng nhập email/mật khẩu đã dùng chung Better Auth với mobile. Hạ tầng callback Google đa hostname đã được chuẩn bị; sau khi có domain public cần thêm callback `https://<domain-web>/api/auth/callback/google` trong Google Cloud, cấu hình allowlist nói trên và kiểm tra redirect thực tế trước khi bật nút Google trên web.
