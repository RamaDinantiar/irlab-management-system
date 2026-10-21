import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { IdleSessionGuard } from '@/components/idle-session-guard';
import { LogoutConfirmDialog } from '@/components/logout-confirm-dialog';
import type { AppLayoutProps } from '@/types';

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            <AppContent variant="sidebar" className="min-w-0 overflow-x-clip">
                <AppSidebarHeader breadcrumbs={breadcrumbs} />
                {/* PRD 7.3: konten maks. 1440px */}
                <div className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col">
                    {children}
                </div>
            </AppContent>
            <IdleSessionGuard />
            <LogoutConfirmDialog />
        </AppShell>
    );
}
