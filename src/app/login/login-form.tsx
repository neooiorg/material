"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Building2, Loader2 } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn.email({ email, password });
    setLoading(false);
    if (error) {
      toast.error("Đăng nhập thất bại", {
        description: "Email hoặc mật khẩu không đúng.",
      });
      return;
    }
    toast.success("Đăng nhập thành công");
    router.push("/");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="size-5" />
          </div>
          <div>
            <CardTitle className="text-lg">Quản lý đặt vật tư</CardTitle>
            <CardDescription>Đăng nhập để tiếp tục</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="ban@congty.vn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mật khẩu</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            Đăng nhập
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Chưa quen hệ thống?{" "}
          <Link href="/docs" className="text-primary hover:underline">
            Xem tài liệu hướng dẫn
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
