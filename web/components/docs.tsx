"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { Expand, Focus, LoaderCircle, Maximize2, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/common";

const allDiagram = String.raw`
flowchart LR
  START([Đăng nhập Sổ Vật Tư]) --> HOME[Tổng quan theo vai trò]

  subgraph ADMIN[Quản trị viên]
    direction TB
    A_PROJECT[Quản lý công trình<br/>và phân công kỹ thuật]
    A_MATERIAL[Quản lý danh mục vật tư]
    A_SUPPLIER[Quản lý đơn vị cung cấp]
    A_BUDGET[Lập dự toán công trình]
    A_MEMBER[Quản lý thành viên]
    A_APPROVE[Duyệt hoặc từ chối đơn]
    A_PROOF[Quản lý chứng từ sau xác nhận]
    A_LOG[Xem nhật ký hệ thống]
  end

  subgraph SITE[Bộ phận thi công]
    direction TB
    S_CREATE[Tạo đơn đặt vật tư]
    S_HISTORY[Xem đơn mình tạo<br/>hoặc công trình phụ trách]
    S_SHARE[Gửi nội dung đặt hàng qua Zalo]
    S_RECEIVE[Ghi nhận nhiều đợt nhận hàng]
    S_CAMERA[Chụp ảnh hoặc chọn ảnh / PDF]
  end

  subgraph ACCOUNT[Kế toán]
    direction TB
    C_ORDER[Xem đơn và chứng từ]
    C_RECON[Đối chiếu dự toán với thực tế]
    C_REPORT[Xem thống kê theo ngày nhận]
    C_EXPORT[Xuất báo cáo CSV]
  end

  subgraph SHARED[Chức năng dùng chung]
    direction TB
    X_PROJECT[Tổng hợp theo công trình]
    X_NOTIFY[Thông báo]
    X_PWA[Cài PWA trên iOS / Android]
    X_UPDATE[Kiểm tra cập nhật ứng dụng]
    X_GUIDE[Sơ đồ hướng dẫn]
  end

  subgraph FLOW[Luồng nghiệp vụ vật tư]
    direction LR
    F_SETUP[Chuẩn bị công trình<br/>vật tư · dự toán · nhà cung cấp]
    F_DRAFT[Đơn mới]
    F_PENDING[Chờ duyệt]
    F_REJECT[Đã từ chối]
    F_APPROVED[Chờ nhận hàng]
    F_EVIDENCE[Ảnh / phiếu nhận hàng]
    F_PARTIAL[Đang nhận hàng nhiều đợt]
    F_DELIVERED[Đã nhận đủ hàng]
    F_ACTUAL[Cộng thực tế theo từng đợt]
    F_SUMMARY[Thống kê · đối chiếu · tổng hợp]
    F_SETUP --> F_DRAFT --> F_PENDING
    F_PENDING -->|Từ chối| F_REJECT
    F_REJECT -->|Chỉnh và gửi lại| F_DRAFT
    F_PENDING -->|Duyệt| F_APPROVED
    F_APPROVED --> F_EVIDENCE --> F_PARTIAL --> F_ACTUAL --> F_SUMMARY
    F_PARTIAL -->|Còn thiếu| F_EVIDENCE
    F_PARTIAL -->|Đã đủ| F_DELIVERED
  end

  HOME --> ADMIN
  HOME --> SITE
  HOME --> ACCOUNT
  HOME --> SHARED

  A_PROJECT --> F_SETUP
  A_MATERIAL --> F_SETUP
  A_SUPPLIER --> F_SETUP
  A_BUDGET --> F_SETUP
  A_MEMBER -. phân quyền .-> START
  S_CREATE --> F_DRAFT
  S_HISTORY --> F_DRAFT
  S_SHARE -. không gửi giá và ghi chú nội bộ .-> A_SUPPLIER
  A_APPROVE --> F_PENDING
  S_RECEIVE --> S_CAMERA --> F_EVIDENCE
  A_PROOF --> F_EVIDENCE
  F_PENDING -.-> X_NOTIFY
  F_DELIVERED -.-> X_NOTIFY
  F_ACTUAL --> X_PROJECT
  F_ACTUAL --> C_RECON
  F_ACTUAL --> C_REPORT --> C_EXPORT
  C_ORDER --> F_EVIDENCE
  A_LOG -. ghi nhận thao tác .-> FLOW
  X_PWA --> X_UPDATE
  X_GUIDE -. mô tả .-> FLOW

  classDef admin fill:#eef2ff,stroke:#6366f1,color:#312e81,stroke-width:1.5px
  classDef site fill:#ecfdf5,stroke:#10b981,color:#065f46,stroke-width:1.5px
  classDef account fill:#fff7ed,stroke:#f97316,color:#9a3412,stroke-width:1.5px
  classDef shared fill:#f8fafc,stroke:#64748b,color:#334155,stroke-width:1.5px
  classDef flow fill:#ffffff,stroke:#94a3b8,color:#0f172a,stroke-width:1.5px
  classDef important fill:#eef2ff,stroke:#4f46e5,color:#312e81,stroke-width:2px
  class A_PROJECT,A_MATERIAL,A_SUPPLIER,A_BUDGET,A_MEMBER,A_APPROVE,A_PROOF,A_LOG admin
  class S_CREATE,S_HISTORY,S_SHARE,S_RECEIVE,S_CAMERA site
  class C_ORDER,C_RECON,C_REPORT,C_EXPORT account
  class X_PROJECT,X_NOTIFY,X_PWA,X_UPDATE,X_GUIDE shared
  class F_SETUP,F_DRAFT,F_PENDING,F_REJECT,F_APPROVED,F_EVIDENCE,F_PARTIAL,F_DELIVERED,F_ACTUAL,F_SUMMARY flow
  class START,HOME,F_DELIVERED,F_ACTUAL important
`;

const mainDiagram = String.raw`
flowchart LR
  A[Quản trị chuẩn bị<br/>công trình · vật tư · dự toán<br/>và phân công kỹ thuật] --> B[Thi công tạo đơn vật tư]
  B --> C{Quản trị duyệt đơn}
  C -->|Từ chối| D[Thi công chỉnh sửa đơn]
  D --> B
  C -->|Duyệt| E[Chờ hàng đến công trình]
  E --> F[Người tạo hoặc kỹ thuật phụ trách<br/>chụp ảnh / tải phiếu PDF]
  F --> G[Ghi ngày và số lượng<br/>thực nhận trong đợt]
  G --> H[Hệ thống cộng số lượng<br/>và chi phí của đợt]
  H --> J{Đã nhận đủ đơn?}
  J -->|Chưa| E
  J -->|Đủ| K[Hoàn tất đơn]
  K --> I[Kế toán đối chiếu<br/>thống kê và xuất CSV]
  G -.-> N[Thông báo Admin và Kế toán]
  H --> P[Tổng hợp theo công trình]

  classDef admin fill:#eef2ff,stroke:#6366f1,color:#312e81,stroke-width:1.5px
  classDef site fill:#ecfdf5,stroke:#10b981,color:#065f46,stroke-width:1.5px
  classDef account fill:#fff7ed,stroke:#f97316,color:#9a3412,stroke-width:1.5px
  classDef system fill:#f8fafc,stroke:#64748b,color:#334155,stroke-width:1.5px
  class A,C admin
  class B,D,E,F,G site
  class I account
  class H,J,K,N,P system
`;

const roleDiagrams = {
  admin: String.raw`
flowchart TB
  LOGIN([Đăng nhập]) --> DASH[Tổng quan]
  DASH --> SETUP[Chuẩn bị dữ liệu]
  SETUP --> PROJECT[Quản lý công trình<br/>phân công kỹ thuật]
  SETUP --> MATERIAL[Quản lý vật tư]
  SETUP --> SUPPLIER[Đơn vị cung cấp]
  SETUP --> BUDGET[Dự toán]
  SETUP --> MEMBER[Thành viên và phân quyền]
  DASH --> APPROVE[Duyệt hoặc từ chối đơn]
  APPROVE --> WAIT[Đơn chờ nhận hàng]
  WAIT --> RECEIVE[Ghi nhận từng đợt khi hàng về]
  RECEIVE --> PROOF[Thêm hoặc xóa chứng từ sau xác nhận]
  DASH --> CONTROL[Theo dõi hệ thống]
  CONTROL --> PROJECT_SUM[Tổng hợp công trình]
  CONTROL --> RECON[Đối chiếu]
  CONTROL --> REPORT[Thống kê]
  CONTROL --> LOG[Nhật ký]
  CONTROL --> NOTIFY[Thông báo]
  classDef role fill:#eef2ff,stroke:#6366f1,color:#312e81,stroke-width:1.5px
  classDef shared fill:#f8fafc,stroke:#64748b,color:#334155,stroke-width:1.5px
  class LOGIN,DASH,SETUP,PROJECT,MATERIAL,SUPPLIER,BUDGET,MEMBER,APPROVE,WAIT,RECEIVE,PROOF role
  class CONTROL,PROJECT_SUM,RECON,REPORT,LOG,NOTIFY shared
`,
  site: String.raw`
flowchart TB
  LOGIN([Đăng nhập]) --> DASH[Tổng quan]
  DASH --> CREATE[Tạo đơn đặt vật tư]
  CREATE --> SELECT[Chọn công trình · vật tư<br/>số lượng · nhà cung cấp]
  SELECT --> SHARE[Gửi nội dung đặt hàng qua Zalo]
  SELECT --> PENDING[Chờ Admin duyệt]
  PENDING -->|Từ chối| EDIT[Chỉnh sửa và gửi lại]
  EDIT --> PENDING
  PENDING -->|Duyệt| WAIT[Xem đơn mình tạo hoặc<br/>công trình được phân công]
  WAIT --> CAMERA[Chụp ảnh hoặc chọn ảnh / PDF]
  CAMERA --> CONFIRM[Nhập ngày và số lượng thực nhận]
  CONFIRM --> ENOUGH{Đã nhận đủ?}
  ENOUGH -->|Chưa| WAIT
  ENOUGH -->|Đủ| HISTORY[Hoàn tất và xem lịch sử chứng từ]
  DASH --> PROJECT[Tổng hợp công trình]
  DASH --> RECON[Đối chiếu]
  DASH --> NOTIFY[Thông báo]
  classDef role fill:#ecfdf5,stroke:#10b981,color:#065f46,stroke-width:1.5px
  classDef shared fill:#f8fafc,stroke:#64748b,color:#334155,stroke-width:1.5px
  class LOGIN,DASH,CREATE,SELECT,SHARE,PENDING,EDIT,WAIT,CAMERA,CONFIRM,ENOUGH,HISTORY role
  class PROJECT,RECON,NOTIFY shared
`,
  accountant: String.raw`
flowchart TB
  LOGIN([Đăng nhập]) --> DASH[Tổng quan]
  DASH --> ORDER[Xem danh sách và chi tiết đơn]
  ORDER --> PROOF[Xem hoặc tải chứng từ]
  DASH --> PROJECT[Tổng hợp theo công trình]
  DASH --> RECON[Đối chiếu dự toán với thực tế]
  RECON --> RECEIVED[Số liệu cộng theo từng đợt thực nhận]
  DASH --> REPORT[Thống kê theo ngày nhận]
  REPORT --> FILTER[Lọc công trình · thời gian · trạng thái]
  FILTER --> CSV[Xuất báo cáo CSV]
  DASH --> NOTIFY[Nhận thông báo đơn đã nhận]
  classDef role fill:#fff7ed,stroke:#f97316,color:#9a3412,stroke-width:1.5px
  classDef shared fill:#f8fafc,stroke:#64748b,color:#334155,stroke-width:1.5px
  class LOGIN,DASH,ORDER,PROOF,RECON,RECEIVED,REPORT,FILTER,CSV role
  class PROJECT,NOTIFY shared
`,
} as const;

type DiagramMode = "main" | "all" | "role";
type DiagramRole = keyof typeof roleDiagrams;

type View = { x: number; y: number; scale: number };
const MIN_SCALE = 0.08;
const MAX_SCALE = 2.5;

export function Docs() {
  const id = useId().replace(/:/g, "");
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; clientX: number; clientY: number; x: number; y: number } | null>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ distance: number; scale: number; centerX: number; centerY: number; x: number; y: number } | null>(null);
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");
  const [view, setView] = useState<View>({ x: 24, y: 24, scale: 0.7 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mode, setMode] = useState<DiagramMode>("main");
  const [role, setRole] = useState<DiagramRole>("admin");
  const activeDiagram = mode === "main" ? mainDiagram : mode === "all" ? allDiagram : roleDiagrams[role];
  const activeKey = mode === "role" ? `role-${role}` : mode;

  const fit = useCallback(() => {
    const viewport = viewportRef.current;
    const svgElement = canvasRef.current?.querySelector("svg");
    if (!viewport || !svgElement) return;
    const box = svgElement.viewBox.baseVal;
    const width = box.width || svgElement.getBoundingClientRect().width;
    const height = box.height || svgElement.getBoundingClientRect().height;
    svgElement.style.width = `${width}px`;
    svgElement.style.height = `${height}px`;
    const scale = Math.min((viewport.clientWidth - 32) / width, (viewport.clientHeight - 32) / height, 1);
    setView({
      scale: Math.max(MIN_SCALE, scale),
      x: Math.max(16, (viewport.clientWidth - width * scale) / 2),
      y: Math.max(16, (viewport.clientHeight - height * scale) / 2),
    });
  }, []);

  useEffect(() => {
    let active = true;
    setSvg("");
    setError("");
    void import("mermaid").then(async ({ default: mermaid }) => {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: "base",
        fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif",
        flowchart: { curve: "basis", htmlLabels: true, nodeSpacing: 34, rankSpacing: 48, padding: 14 },
        themeVariables: {
          background: "#ffffff",
          primaryColor: "#eef2ff",
          primaryTextColor: "#111827",
          primaryBorderColor: "#6366f1",
          lineColor: "#64748b",
          clusterBkg: "#f8fafc",
          clusterBorder: "#cbd5e1",
          fontSize: "15px",
        },
      });
      try {
        const result = await mermaid.render(`material-flow-${id}-${activeKey}`, activeDiagram);
        if (!active) return;
        setSvg(result.svg);
        requestAnimationFrame(() => requestAnimationFrame(fit));
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "Không thể hiển thị sơ đồ.");
      }
    });
    return () => { active = false; };
  }, [activeDiagram, activeKey, fit, id]);

  useEffect(() => {
    const onFullscreen = () => {
      setIsFullscreen(document.fullscreenElement === viewportRef.current);
      requestAnimationFrame(fit);
    };
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => document.removeEventListener("fullscreenchange", onFullscreen);
  }, [fit]);

  function zoom(multiplier: number) {
    const viewport = viewportRef.current;
    if (!viewport) return;
    setView((current) => {
      const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, current.scale * multiplier));
      const centerX = viewport.clientWidth / 2;
      const centerY = viewport.clientHeight / 2;
      return {
        scale,
        x: centerX - (centerX - current.x) * (scale / current.scale),
        y: centerY - (centerY - current.y) * (scale / current.scale),
      };
    });
  }

  async function toggleFullscreen() {
    if (!viewportRef.current) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await viewportRef.current.requestFullscreen();
  }

  function pointerPosition(event: ReactPointerEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function beginPointer(event: ReactPointerEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest("button")) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointerPosition(event);
    pointersRef.current.set(event.pointerId, point);
    const points = [...pointersRef.current.values()];
    if (points.length === 1) {
      dragRef.current = { pointerId: event.pointerId, clientX: point.x, clientY: point.y, x: view.x, y: view.y };
      pinchRef.current = null;
      return;
    }
    if (points.length === 2) {
      const [first, second] = points;
      pinchRef.current = {
        distance: Math.hypot(second.x - first.x, second.y - first.y),
        centerX: (first.x + second.x) / 2,
        centerY: (first.y + second.y) / 2,
        scale: view.scale,
        x: view.x,
        y: view.y,
      };
      dragRef.current = null;
    }
  }

  function movePointer(event: ReactPointerEvent<HTMLElement>) {
    if (!pointersRef.current.has(event.pointerId)) return;
    event.preventDefault();
    const point = pointerPosition(event);
    pointersRef.current.set(event.pointerId, point);
    const points = [...pointersRef.current.values()];
    const pinch = pinchRef.current;
    if (points.length >= 2 && pinch) {
      const [first, second] = points;
      const centerX = (first.x + second.x) / 2;
      const centerY = (first.y + second.y) / 2;
      const distance = Math.max(1, Math.hypot(second.x - first.x, second.y - first.y));
      const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, pinch.scale * distance / Math.max(1, pinch.distance)));
      const diagramX = (pinch.centerX - pinch.x) / pinch.scale;
      const diagramY = (pinch.centerY - pinch.y) / pinch.scale;
      setView({ scale, x: centerX - diagramX * scale, y: centerY - diagramY * scale });
      return;
    }
    const drag = dragRef.current;
    if (points.length === 1 && drag?.pointerId === event.pointerId) {
      setView((current) => ({ ...current, x: drag.x + point.x - drag.clientX, y: drag.y + point.y - drag.clientY }));
    }
  }

  function endPointer(event: ReactPointerEvent<HTMLElement>) {
    pointersRef.current.delete(event.pointerId);
    const remaining = [...pointersRef.current.entries()];
    pinchRef.current = null;
    if (remaining.length === 1) {
      const [pointerId, point] = remaining[0];
      dragRef.current = { pointerId, clientX: point.x, clientY: point.y, x: view.x, y: view.y };
    } else {
      dragRef.current = null;
    }
  }

  return <>
    <PageTitle
      title="Sơ đồ hoạt động Sổ Vật Tư"
      description="Xem nhanh luồng chính, mở toàn bộ hệ thống hoặc tập trung vào công việc của từng vai trò."
      action={<Button variant="outline" render={<Link href="/" />}>Về trang chính</Button>}
    />

    <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Chọn loại sơ đồ">
      <ModeButton active={mode === "main"} onClick={() => setMode("main")}>Luồng chính</ModeButton>
      <ModeButton active={mode === "all"} onClick={() => setMode("all")}>Toàn hệ thống</ModeButton>
      <ModeButton active={mode === "role"} onClick={() => setMode("role")}>Theo vai trò</ModeButton>
    </div>

    {mode === "role" && <div className="mb-4 flex flex-wrap gap-2 border-b pb-4" role="group" aria-label="Chọn vai trò">
      <RoleButton active={role === "admin"} color="indigo" onClick={() => setRole("admin")}>Quản trị viên</RoleButton>
      <RoleButton active={role === "site"} color="emerald" onClick={() => setRole("site")}>Bộ phận thi công</RoleButton>
      <RoleButton active={role === "accountant"} color="orange" onClick={() => setRole("accountant")}>Kế toán</RoleButton>
    </div>}

    <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground" aria-label="Chú giải vai trò">
      <Legend color="bg-indigo-500" label="Quản trị viên" />
      <Legend color="bg-emerald-500" label="Bộ phận thi công" />
      <Legend color="bg-orange-500" label="Kế toán" />
      <Legend color="bg-slate-500" label="Dùng chung và hệ thống" />
      <span className="ml-auto hidden md:inline">Kéo để di chuyển · cuộn hoặc chụm hai ngón để thu phóng</span>
    </div>

    <section
      ref={viewportRef}
      className="docs-diagram-shell relative h-[68svh] min-h-[520px] w-full overflow-hidden rounded-2xl border bg-muted/30 shadow-[0_18px_50px_-36px_color-mix(in_oklch,var(--foreground)_45%,transparent)] select-none"
      aria-label="Sơ đồ luồng hoạt động toàn hệ thống"
      onWheel={(event) => {
        event.preventDefault();
        const rect = event.currentTarget.getBoundingClientRect();
        const pointerX = event.clientX - rect.left;
        const pointerY = event.clientY - rect.top;
        setView((current) => {
          const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, current.scale * (event.deltaY < 0 ? 1.12 : 0.89)));
          return { scale, x: pointerX - (pointerX - current.x) * (scale / current.scale), y: pointerY - (pointerY - current.y) * (scale / current.scale) };
        });
      }}
      onPointerDown={beginPointer}
      onPointerMove={movePointer}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
    >
      <div className="absolute left-3 top-3 z-10 flex items-center gap-1 rounded-xl border bg-background/95 p-1 shadow-sm" aria-label="Điều khiển sơ đồ">
        <Control icon={Minus} label="Thu nhỏ" onClick={() => zoom(0.8)} />
        <span className="min-w-12 text-center text-xs tabular-nums text-muted-foreground">{Math.round(view.scale * 100)}%</span>
        <Control icon={Plus} label="Phóng to" onClick={() => zoom(1.25)} />
        <span className="mx-1 h-5 w-px bg-border" />
        <Control icon={Focus} label="Xem toàn bộ sơ đồ" onClick={fit} />
        <Control icon={isFullscreen ? Expand : Maximize2} label={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"} onClick={() => void toggleFullscreen()} />
      </div>

      {!svg && !error && <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" aria-hidden="true" />Đang vẽ sơ đồ…</div>}
      {error && <div className="flex h-full items-center justify-center p-6 text-center text-sm text-destructive">{error}</div>}
      {svg && <div
        ref={canvasRef}
        className="absolute left-0 top-0 cursor-grab touch-none active:cursor-grabbing [&_svg]:block [&_svg]:h-auto [&_svg]:max-w-none"
        style={{ transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})`, transformOrigin: "0 0" }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />}

      <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-lg bg-background/90 px-3 py-1.5 text-center text-xs text-muted-foreground shadow-sm md:hidden">
        Kéo để di chuyển · chụm hai ngón để thu phóng
      </div>
    </section>
  </>;
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="inline-flex items-center gap-2"><span className={`size-2.5 rounded-full ${color}`} aria-hidden="true" />{label}</span>;
}

function Control({ icon: Icon, label, onClick }: { icon: typeof Plus; label: string; onClick: () => void }) {
  return <Button type="button" size="icon-sm" variant="ghost" aria-label={label} title={label} onClick={onClick}><Icon aria-hidden="true" /></Button>;
}

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return <Button type="button" variant={active ? "default" : "outline"} aria-pressed={active} onClick={onClick}>{children}</Button>;
}

function RoleButton({ active, color, onClick, children }: { active: boolean; color: "indigo" | "emerald" | "orange"; onClick: () => void; children: ReactNode }) {
  const activeClass = {
    indigo: "border-indigo-500 bg-indigo-50 text-indigo-900 hover:bg-indigo-100",
    emerald: "border-emerald-500 bg-emerald-50 text-emerald-900 hover:bg-emerald-100",
    orange: "border-orange-500 bg-orange-50 text-orange-900 hover:bg-orange-100",
  }[color];
  return <Button type="button" size="sm" variant="outline" className={active ? activeClass : undefined} aria-pressed={active} onClick={onClick}>{children}</Button>;
}
