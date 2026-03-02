import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Outlet } from "react-router-dom";

export function AppLayout() {
    return (
        <SidebarProvider>
            <AppSidebar />
            <main className="flex-1 overflow-x-hidden bg-zinc-50 min-h-screen flex flex-col">
                <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b bg-white px-4 shadow-sm">
                    <SidebarTrigger className="text-zinc-500 hover:text-zinc-900 transition-colors" />
                </header>
                <div className="flex-1 flex flex-col w-full relative">
                    <Outlet />
                </div>
            </main>
        </SidebarProvider>
    );
}
