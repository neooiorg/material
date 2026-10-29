# Hướng dẫn phát hành mobile

App Expo này dùng **EAS Update** trên kênh `preview`. Mục tiêu là chỉ cài APK lại khi native runtime thay đổi; các thay đổi JavaScript/TypeScript còn lại phát hành OTA và người dùng bấm **Menu → Kiểm tra cập nhật**.

## Quy tắc quyết định

| Loại thay đổi | Cách phát hành |
| --- | --- |
| UI, route Expo Router, TypeScript/JavaScript, logic nghiệp vụ client, gọi API, text, style, ảnh/tài nguyên JS | EAS Update, không build APK |
| Thêm/nâng cấp native module, Expo SDK, React Native, config plugin, quyền Android/iOS, `app.json`, icon/splash, native config | Tăng `expo.version`, build APK mới; sau đó mới phát hành OTA tương thích nếu cần |
| Server/Dokploy thuần túy | Deploy backend theo yêu cầu; không cần EAS Update hoặc APK nếu app client không đổi |

`runtimeVersion` dùng policy `appVersion`. Vì vậy **không được** gửi OTA chứa thay đổi native cho APK có cùng `expo.version`.

## Kiểm tra trước khi phát hành

Chạy tại thư mục gốc repository:

```powershell
pnpm typecheck
pnpm --dir server typecheck
pnpm exec expo export --platform android --clear
```

Không sửa `.env`, không đưa secret vào source hoặc log. Dừng và sửa lỗi trước khi publish/build. Cảnh báo Uniwind `Invalid calc` hiện không làm Android export fail, nhưng lỗi bundle thực tế thì phải xử lý.

## Phát hành OTA (thay đổi không native)

Chỉ thực hiện khi người dùng yêu cầu phát hành. Sau khi các kiểm tra pass:

```powershell
npx eas-cli@latest update --channel preview --message "Mô tả ngắn thay đổi"
```

Thông báo cho người dùng: mở app, vào **Menu → Kiểm tra cập nhật**. App sẽ tải bản mới và tự khởi động lại. Expo Go không nhận EAS Update; chỉ APK preview/phát hành đã tích hợp `expo-updates` mới dùng được.

## Build APK nền mới (thay đổi native)

1. Cập nhật `expo.version` trong `app.json` theo semantic version phù hợp.
2. Chạy đầy đủ các kiểm tra ở trên.
3. Chỉ khi người dùng cho phép tạo artifact bên ngoài, chạy:

```powershell
npx eas-cli@latest build --platform android --profile preview --non-interactive
```

4. Chờ build EAS hoàn tất, gửi link APK cho người dùng cài một lần.
5. Không commit, push, hay deploy backend trừ khi người dùng yêu cầu riêng.

Sau khi APK mới đã được cài, các thay đổi UI/logic tiếp theo quay lại quy trình OTA ở trên.

## Cấu hình hiện tại cần giữ

- EAS project ID: `c12085e9-2bfe-4ef4-a3c1-5f6733d51b77`
- EAS Update channel: `preview`
- Android build profile: `preview` (`APK`, internal distribution)
- `expo-updates` được cấu hình trong `app.json`; không bỏ URL updates hoặc `runtimeVersion`.
