"use client";

import { ReactNode } from "react";
import { DashboardLayout } from "@/components/layout";

export default function StaffLayout({ children }: { children: ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
