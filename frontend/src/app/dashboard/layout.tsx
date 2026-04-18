'use client';

import DashboardLayout from "@/components/DashboardLayout";
import { SessionAuthForNextJS } from "@/components/SessionAuthForNextJS";

export default function DashLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <SessionAuthForNextJS>
            <DashboardLayout>{children}</DashboardLayout>
        </SessionAuthForNextJS>
    );
}
