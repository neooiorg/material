"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Expand, Focus, LoaderCircle, Maximize2, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/common";

const diagram = String.raw`
flowchart LR
  START([Đăng nhập Sổ Vật Tư]) --> HOME[Tổng quan theo vai trò]

  subgraph ADMIN[Quản trị viên]
    direction TB
    A_PROJECT[Quản lý công trình]
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
    S_HISTORY[Xem chi tiết và lịch sử đơn]
    S_SHARE[Gửi nội dung đặt hàng qua Zalo]
    S_RECEIVE[Xác nhận nhận hàng một lần]
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
    F_DELIVERED[Đã nhận hàng]
    F_ACTUAL[Cộng thực tế đúng một lần]
    F_SUMMARY[Thống kê · đối chiếu · tổng hợp]
    F_SETUP --> F_DRAFT --> F_PENDING
    F_PENDING -->|Từ chối| F_REJECT
    F_REJECT -->|Chỉnh và gửi lại| F_DRAFT
    F_PENDING -->|Duyệt| F_APPROVED
    F_APPROVED --> F_EVIDENCE --> F_DELIVERED --> F_ACTUAL --> F_SUMMARY
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
  class F_SETUP,F_DRAFT,F_PENDING,F_REJECT,F_APPROVED,F_EVIDENCE,F_DELIVERED,F_ACTUAL,F_SUMMARY flow
  class START,HOME,F_DELIVERED,F_ACTUAL important
`;

type View = { x: number; y: number; scale: number };
const MIN_SCALE = 0.08;
const MAX_SCALE = 2.5;

export function Docs() {
  const id = useId().replace(/:/g, "");
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; clientX: number; clientY: number; x: number; y: number } | null>(null);
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");
  const [view, setView] = useState<View>({ x: 24, y: 24, scale: 0.7 });
  const [isFullscreen, setIsFullscreen] = useState(false);

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
        const result = await mermaid.render(`material-flow-${id}`, diagram);
        if (!active) return;
        setSvg(result.svg);
        requestAnimationFrame(() => requestAnimationFrame(fit));
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "Không thể hiển thị sơ đồ.");
      }
    });
    return () => { active = false; };
  }, [fit, id]);

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

  return <>
    <PageTitle
      title="Sơ đồ hoạt động Sổ Vật Tư"
      description="Toàn bộ luồng nghiệp vụ, quyền hạn và điểm phối hợp giữa các vai trò trong một sơ đồ tương tác."
      action={<Button variant="outline" render={<Link href="/" />}>Về trang chính</Button>}
    />

    <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground" aria-label="Chú giải vai trò">
      <Legend color="bg-indigo-500" label="Quản trị viên" />
      <Legend color="bg-emerald-500" label="Bộ phận thi công" />
      <Legend color="bg-orange-500" label="Kế toán" />
      <Legend color="bg-slate-500" label="Dùng chung và hệ thống" />
      <span className="ml-auto hidden md:inline">Kéo để di chuyển · cuộn để phóng to</span>
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
      onPointerDown={(event) => {
        if ((event.target as HTMLElement).closest("button")) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        dragRef.current = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, x: view.x, y: view.y };
      }}
      onPointerMove={(event) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        setView((current) => ({ ...current, x: drag.x + event.clientX - drag.clientX, y: drag.y + event.clientY - drag.clientY }));
      }}
      onPointerUp={(event) => {
        if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
      }}
      onPointerCancel={() => { dragRef.current = null; }}
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
        Kéo sơ đồ · dùng nút +/− để thu phóng
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
