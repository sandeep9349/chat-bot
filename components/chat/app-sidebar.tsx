"use client"

import * as React from "react"
import { MessageSquare, Plus, Settings, User, Search, LogOut } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarInput,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
    useSidebar,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/context/AuthContext"
import { API_ENDPOINTS, getImageUrl } from "@/lib/api-config"
import { ShareDialog } from "@/components/share-dialog"
import { Share2, ChevronUp } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function AppSidebar() {
    const [chatHistory, setChatHistory] = React.useState<any[]>([])
    const [query, setQuery] = React.useState("")
    const [debouncedQuery, setDebouncedQuery] = React.useState("")
    const [shortcut, setShortcut] = React.useState("Ctrl+K")
    const { isMobile, setOpenMobile } = useSidebar()
    const { token, logout, user } = useAuth()
    const [isShareOpen, setIsShareOpen] = React.useState(false)

    const router = useRouter()
    const searchParams = useSearchParams()
    const activeChatId = searchParams?.get('id')

    const fetchChats = async () => {
        try {
            if (!token) return;
            const res = await fetch(API_ENDPOINTS.chats.list, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            if (res.ok) {
                const data = await res.json()
                setChatHistory(data)
            }
        } catch (error) {
            console.error("Failed to fetch chats", error)
        }
    }

    React.useEffect(() => {
        fetchChats()

        const handleRefresh = () => fetchChats()
        window.addEventListener('refresh-chats', handleRefresh)
        return () => window.removeEventListener('refresh-chats', handleRefresh)
    }, [token])

    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(query)
        }, 300)
        return () => clearTimeout(timer)
    }, [query])

    React.useEffect(() => {
        if (typeof window !== "undefined") {
            const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0
            setShortcut(isMac ? "⌘K" : "Ctrl+K")
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                const input = document.querySelector("[data-sidebar-search]") as HTMLInputElement
                if (input) {
                    input.focus()
                }
            }
        }

        document.addEventListener("keydown", handleKeyDown)
        return () => document.removeEventListener("keydown", handleKeyDown)
    }, [])

    const filteredHistory = React.useMemo(() => {
        let history = chatHistory
        if (debouncedQuery) {
            history = history.filter((item) =>
                item.title.toLowerCase().includes(debouncedQuery.toLowerCase())
            )
        }

        const groups: Record<string, any[]> = {
            "Today": [],
            "Yesterday": [],
            "This Week": [],
            "Last Week": [],
            "Older": []
        };

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());

        const startOfLastWeek = new Date(startOfWeek);
        startOfLastWeek.setDate(startOfWeek.getDate() - 7);

        // Sort chronologically descending
        const sortedHistory = [...history].sort((a, b) => {
            const dateA = new Date(a.created_at || 0).getTime();
            const dateB = new Date(b.created_at || 0).getTime();
            return dateB - dateA;
        });

        sortedHistory.forEach(chat => {
            if (!chat.created_at) {
                groups["Older"].push(chat);
                return;
            }

            const chatDate = new Date(chat.created_at);

            if (chatDate >= today) {
                groups["Today"].push(chat);
            } else if (chatDate >= yesterday) {
                groups["Yesterday"].push(chat);
            } else if (chatDate >= startOfWeek) {
                groups["This Week"].push(chat);
            } else if (chatDate >= startOfLastWeek) {
                groups["Last Week"].push(chat);
            } else {
                const monthYear = chatDate.toLocaleDateString('default', { month: 'long', year: 'numeric' });
                if (!groups[monthYear]) {
                    groups[monthYear] = [];
                }
                groups[monthYear].push(chat);
            }
        });

        const activeGroups = [
            { label: "Today", items: groups["Today"] },
            { label: "Yesterday", items: groups["Yesterday"] },
            { label: "This Week", items: groups["This Week"] },
            { label: "Last Week", items: groups["Last Week"] },
        ];

        // Add dynamic month-year groups in the order they were naturally inserted (which is descending order since history is sorted)
        Object.keys(groups).forEach(key => {
            if (!["Today", "Yesterday", "This Week", "Last Week", "Older"].includes(key)) {
                activeGroups.push({ label: key, items: groups[key] });
            }
        });

        if (groups["Older"].length > 0) {
            activeGroups.push({ label: "Older", items: groups["Older"] });
        }

        return activeGroups.filter(g => g.items.length > 0)
    }, [debouncedQuery, chatHistory])

    return (
        <Sidebar>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground cursor-pointer" onClick={() => router.push('/')}>
                            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-blue-600 text-sidebar-primary-foreground">
                                <MessageSquare className="size-4" />
                            </div>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-semibold">Vextron Chat</span>
                                <span className="truncate text-xs">Pro Plan</span>
                            </div>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>

                <div className="px-2 py-1">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <SidebarInput
                            data-sidebar-search
                            placeholder="Search chats..."
                            className="pl-8 pr-12 bg-sidebar-accent/50 focus:bg-background transition-colors"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                        {!isMobile && (
                            <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                                {shortcut}
                            </kbd>
                        )}
                    </div>
                </div>

                <div className="px-2 pb-2">
                    <Button
                        className="w-full justify-start gap-2"
                        variant="outline"
                        onClick={() => {
                            router.push('/chat')
                            if (isMobile) {
                                setOpenMobile(false)
                            }
                        }}
                    >
                        <Plus className="w-4 h-4" />
                        New Chat
                    </Button>
                </div>
            </SidebarHeader>
            <SidebarContent>
                {filteredHistory.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                        No chats found
                    </div>
                ) : (
                    filteredHistory.map((group) => (
                        <SidebarGroup key={group.label}>
                            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    {group.items.map((item) => (
                                        <SidebarMenuItem key={item.id}>
                                            <SidebarMenuButton
                                                asChild
                                                isActive={activeChatId === item.id.toString()}
                                            >
                                                <button onClick={() => {
                                                    router.push(`/chat?id=${item.id}`)
                                                    if (isMobile) setOpenMobile(false)
                                                }}>
                                                    <MessageSquare className="mr-2 h-4 w-4 opacity-50" />
                                                    <span className="truncate">{item.title}</span>
                                                </button>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    ))}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    ))
                )}
            </SidebarContent>
            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <SidebarMenuButton 
                                    size="lg" 
                                    className="w-full hover:bg-sidebar-accent transition-colors"
                                >
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={getImageUrl(user?.profile_picture)} alt={user?.username || "User"} />
                                        <AvatarFallback>{user ? `${user.first_name?.[0] || 'A'}${user.last_name?.[0] || 'S'}` : 'U'}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0 text-left">
                                        <p className="text-sm font-medium truncate">{user?.username || 'User'}</p>
                                        <p className="text-xs text-muted-foreground truncate">{user?.email || ''}</p>
                                    </div>
                                    <ChevronUp className="ml-auto h-4 w-4 text-muted-foreground" />
                                </SidebarMenuButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                side="top"
                                align="start"
                                className="w-[--radix-dropdown-menu-trigger-width] mb-2"
                            >
                                <DropdownMenuItem onClick={() => router.push('/profile')}>
                                    <User className="mr-2 h-4 w-4" />
                                    <span>Profile Details</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setIsShareOpen(true)}>
                                    <Share2 className="mr-2 h-4 w-4" />
                                    <span>Share Vextron AI</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                    className="text-destructive focus:text-destructive" 
                                    onClick={logout}
                                >
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Log out</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarMenuItem>
                </SidebarMenu>
                <ShareDialog isOpen={isShareOpen} onOpenChange={setIsShareOpen} />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}
