import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  return {
    metadataBase: new URL(origin),
    title: "深圳居民就餐调查｜任务领取",
    description: "深圳市居民就餐调查配额任务领取与管理平台",
    openGraph: { title: "深圳居民就餐调查", description: "任务领取与配额管理", images: [`${origin}/og.png`] },
    twitter: { card: "summary_large_image", title: "深圳居民就餐调查", description: "任务领取与配额管理", images: [`${origin}/og.png`] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
