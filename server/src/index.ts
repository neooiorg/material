import { createApp } from "./app.js";
import { config, requireServerConfig } from "./config.js";
import { ensureRuntimeDatabaseCompatibility } from "./services/db-migration-service.js";
import { mergeDirectorRoleIntoAdmin } from "./services/role-migration.js";
import { initializePushService } from "./services/push-service.js";
import { ensureTestAccounts } from "./services/test-account-service.js";

requireServerConfig();

async function start() {
  await ensureRuntimeDatabaseCompatibility();
  await mergeDirectorRoleIntoAdmin();
  await ensureTestAccounts();
  await initializePushService();
  createApp().listen(config.port, () => {
    console.log(`Material API đang chạy tại http://localhost:${config.port}`);
  });
}

start().catch((error) => {
  console.error("Không thể khởi động Material API.", error);
  process.exit(1);
});
