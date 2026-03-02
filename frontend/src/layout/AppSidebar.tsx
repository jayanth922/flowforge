import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { LayoutDashboard, Zap, FileJson, Blocks, Settings, LogOut } from "lucide-react";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const items = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "Templates", url: "/templates", icon: FileJson },
    { title: "Integrations", url: "/integrations", icon: Blocks },
    { title: "Settings", url: "#", icon: Settings },
];

export function AppSidebar() {
    const user = useAuthStore((s) => s.user);
    const logout = useAuthStore((s) => s.logout);
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    return (
        <Sidebar>
            <SidebarHeader className="p-4 border-b">
                <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-zinc-900">
                    <Zap className="h-6 w-6 text-indigo-600" />
                    <span>FlowForge</span>
                </div>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Main Menu</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {items.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={location.pathname === item.url || (item.url.startsWith('/workflows') && location.pathname.startsWith('/workflows'))}
                                        className="transition-colors duration-200"
                                    >
                                        <Link to={item.url} className="flex items-center gap-3">
                                            <item.icon className="h-4 w-4" />
                                            <span className="font-medium">{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter className="p-4 border-t flex flex-col gap-2">
                {user && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <SidebarMenuButton size="lg" className="w-full justify-start gap-3 transition-colors duration-200 outline-none hover:bg-muted/50 rounded-lg p-2 h-auto">
                                <Avatar className="h-9 w-9 rounded-lg border">
                                    <AvatarFallback className="rounded-lg bg-zinc-100 text-zinc-600">{user.email.substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col items-start text-sm overflow-hidden text-left flex-1">
                                    <span className="font-semibold truncate w-full text-zinc-900 leading-tight">{user.email}</span>
                                    <span className="text-xs text-muted-foreground truncate w-full mt-0.5">Administrator</span>
                                </div>
                            </SidebarMenuButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56" side="right" sideOffset={8}>
                            <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer">
                                <LogOut className="mr-2 h-4 w-4" />
                                <span className="font-medium">Log out</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </SidebarFooter>
        </Sidebar>
    );
}
