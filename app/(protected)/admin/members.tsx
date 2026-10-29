import { useEffect, useState } from "react";
import { View } from "react-native";
import { Stack } from "expo-router";
import { Button, Card, Dialog, Text, TextInput, TruncatedText } from "@/components/ui";
import { DataTable } from "@/components/data-table";
import { Empty, Screen, StateView } from "@/components/screen";
import { SelectMenu } from "@/components/select-menu";
import { useNotice } from "@/components/snackbar";
import { useApi } from "@/hooks/use-api";
import { api, jsonBody } from "@/lib/api";
import { formatDate, roleLabels } from "@/lib/format";
import { colors, fonts, spacing } from "@/theme";

type MemberRole = "admin" | "site" | "accountant";
type Member = { id: string; name: string; email: string; role: MemberRole; createdAt: string };
type Draft = { name: string; email: string; role: MemberRole };
type InviteResult = Member & { temporaryPassword: string; emailSent: boolean; emailWarning?: string | null };

const emptyDraft: Draft = { name: "", email: "", role: "site" };
const roleOptions = [
  { value: "site", label: roleLabels.site },
  { value: "accountant", label: roleLabels.accountant },
  { value: "admin", label: roleLabels.admin },
];

export default function Members() {
  const query = useApi<Member[]>("/api/members");
  const notice = useNotice();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Member | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [inviteResult, setInviteResult] = useState<InviteResult | null>(null);

  useEffect(() => {
    if (!editTarget) return;
    setDraft({ name: editTarget.name, email: editTarget.email, role: editTarget.role });
  }, [editTarget]);

  function openInvite() {
    setDraft(emptyDraft);
    setInviteResult(null);
    setInviteOpen(true);
  }

  async function invite() {
    setSaving(true);
    try {
      const result = await api<InviteResult>("/api/members/invite", { method: "POST", ...jsonBody(draft) });
      setInviteResult(result);
      notice(result.emailSent ? "Đã mời thành viên và gửi email." : "Đã tạo thành viên, nhưng email chưa được gửi.");
      await query.refresh();
    } catch (error) {
      notice(error instanceof Error ? error.message : "Không thể mời thành viên.");
    } finally {
      setSaving(false);
    }
  }

  async function update() {
    if (!editTarget) return;
    setSaving(true);
    try {
      await api(`/api/members/${editTarget.id}`, { method: "PATCH", ...jsonBody(draft) });
      setEditTarget(null);
      notice("Đã cập nhật thành viên.");
      await query.refresh();
    } catch (error) {
      notice(error instanceof Error ? error.message : "Không thể cập nhật thành viên.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await api(`/api/members/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      notice("Đã xóa thành viên.");
      await query.refresh();
    } catch (error) {
      notice(error instanceof Error ? error.message : "Không thể xóa thành viên.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: "Quản lý thành viên" }} />
      <Card mode="contained" style={{ backgroundColor: colors.primaryContainer, borderColor: colors.primaryBorder }}>
        <Card.Content>
          <Text selectable>
            Admin mời nhân sự nội bộ vào app. Nhà cung cấp bên ngoài không đăng nhập; chỉ lưu ở danh bạ Đơn vị cung cấp/Zalo.
          </Text>
        </Card.Content>
      </Card>
      <Button mode="contained" icon="plus" onPress={openInvite}>Mời người</Button>
      <StateView loading={query.loading} error={query.error} retry={query.refresh}>
        {query.data?.length ? (
          <DataTable
            rows={query.data}
            searchPlaceholder="Tìm tên hoặc email"
            getSearchText={(row) => `${row.name} ${row.email} ${roleLabels[row.role]}`}
            filters={[{ key: "role", label: "Tất cả vai trò", options: roleOptions, matches: (row, value) => row.role === value }]}
            columns={[
              { key: "name", label: "Tên", width: 176, render: (row) => <TruncatedText title="Tên thành viên" lines={2} variant="labelMedium">{row.name}</TruncatedText> },
              { key: "email", label: "Email", width: 230, render: (row) => row.email },
              { key: "role", label: "Vai trò", width: 150, render: (row) => roleLabels[row.role] },
              { key: "created", label: "Ngày tạo", width: 120, render: (row) => formatDate(row.createdAt) },
              { key: "actions", label: "Thao tác", width: 210, render: (row) => (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  <Button compact mode="outlined" onPress={() => setEditTarget(row)}>Sửa</Button>
                  <Button compact textColor={colors.danger} onPress={() => setDeleteTarget(row)}>Xóa</Button>
                </View>
              ) },
            ]}
          />
        ) : <Empty>Chưa có thành viên nào.</Empty>}
      </StateView>

      <Dialog visible={inviteOpen} onDismiss={() => setInviteOpen(false)}>
        <Dialog.Title>Mời thành viên</Dialog.Title>
        <Dialog.Content style={{ gap: spacing.md }}>
          <MemberFields draft={draft} setDraft={setDraft} />
          {inviteResult ? (
            <Card mode="contained" style={{ backgroundColor: colors.surfaceMuted }}>
              <Card.Content>
                <Text selectable variant="labelMedium">Thông tin đăng nhập tạm</Text>
                <Text selectable>Email: {inviteResult.email}</Text>
                <Text selectable style={{ fontFamily: fonts.semibold }}>Mật khẩu: {inviteResult.temporaryPassword}</Text>
                <Text selectable style={{ color: inviteResult.emailSent ? colors.success : colors.warning }}>
                  {inviteResult.emailSent ? "Email Resend đã gửi thành công." : inviteResult.emailWarning ?? "Email chưa được gửi."}
                </Text>
              </Card.Content>
            </Card>
          ) : null}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setInviteOpen(false)}>Đóng</Button>
          <Button mode="contained" loading={saving} disabled={saving || !!inviteResult} onPress={invite}>Mời</Button>
        </Dialog.Actions>
      </Dialog>

      <Dialog visible={!!editTarget} onDismiss={() => setEditTarget(null)}>
        <Dialog.Title>Sửa thành viên</Dialog.Title>
        <Dialog.Content style={{ gap: spacing.md }}>
          <MemberFields draft={draft} setDraft={setDraft} />
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setEditTarget(null)}>Hủy</Button>
          <Button mode="contained" loading={saving} disabled={saving} onPress={update}>Lưu</Button>
        </Dialog.Actions>
      </Dialog>

      <Dialog visible={!!deleteTarget} onDismiss={() => setDeleteTarget(null)}>
        <Dialog.Title>Xóa thành viên?</Dialog.Title>
        <Dialog.Content>
          <Text selectable>Chỉ xóa được thành viên chưa phát sinh hoặc duyệt đơn. Thành viên có dữ liệu nghiệp vụ sẽ được hệ thống chặn để giữ lịch sử.</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setDeleteTarget(null)}>Hủy</Button>
          <Button textColor={colors.danger} loading={saving} disabled={saving} onPress={remove}>Xóa</Button>
        </Dialog.Actions>
      </Dialog>
    </Screen>
  );
}

function MemberFields({ draft, setDraft }: { draft: Draft; setDraft: (updater: (draft: Draft) => Draft) => void }) {
  return (
    <>
      <TextInput label="Họ tên" value={draft.name} onChangeText={(name) => setDraft((current) => ({ ...current, name }))} />
      <TextInput label="Email" autoCapitalize="none" keyboardType="email-address" value={draft.email} onChangeText={(email) => setDraft((current) => ({ ...current, email }))} />
      <SelectMenu label="Vai trò" value={draft.role} onChange={(role) => setDraft((current) => ({ ...current, role: role as MemberRole }))} options={roleOptions} />
    </>
  );
}
