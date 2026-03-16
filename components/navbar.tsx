"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, User, Settings, LogOut, Menu, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ModeToggle } from "@/components/mode-toggle";
import { useAuth } from "@/context/AuthContext";
import { getImageUrl } from "@/lib/api-config";

export default function Navbar() {
    const { user, logout, loading } = useAuth();

    const initials = user ? (user.first_name?.[0] || 'A') + (user.last_name?.[0] || 'S') : 'U';
    const profilePic = getImageUrl(user?.profile_picture);

    return (
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
            <div className="container mx-auto flex h-14 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
                <div className="mr-4 flex">
                    <Link href="/" className="mr-6 flex items-center space-x-2">
                        <div className="rounded-lg bg-primary/10 p-1.5 text-primary flex items-center justify-center">
                            <Sparkles className="h-4 w-4" />
                        </div>
                        <span className="hidden font-bold sm:inline-block">
                            Vextron AI
                        </span>
                    </Link>
                
                </div>
                <div className="flex flex-1 items-center justify-end space-x-2">
                    {/* Change space-x-2 to space-x-4 here */}
                    <nav className="flex items-center space-x-7">
                        <ModeToggle />
                        {loading ? (
                            <div className="h-8 w-8 rounded-full bg-muted animate-pulse"></div>
                        ) : user ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                                        <Avatar className="h-8 w-8 transition-opacity hover:opacity-80">
                                            <AvatarImage src={profilePic || "https://github.com/shadcn.png"} alt="@user" />
                                            <AvatarFallback>{initials}</AvatarFallback>
                                        </Avatar>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-56" align="end" forceMount>
                                    <DropdownMenuLabel className="font-normal">
                                        <div className="flex flex-col space-y-1">
                                            <p className="text-sm font-medium leading-none">{user.first_name} {user.last_name}</p>
                                            <p className="text-xs leading-none text-muted-foreground">
                                                {user.email}
                                            </p>
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                        <Link href="/profile" className="flex items-center cursor-pointer">
                                            <User className="mr-2 h-4 w-4" />
                                            <span>Profile</span>
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <button
                                            className="w-full flex items-center cursor-pointer"
                                            onClick={() => {
                                                if (navigator.share) {
                                                    navigator.share({
                                                        title: 'ChatBot AI',
                                                        url: window.location.href
                                                    }).catch(console.error);
                                                } else {
                                                    navigator.clipboard.writeText(window.location.href);
                                                }
                                            }}
                                        >
                                            <Share2 className="mr-2 h-4 w-4" />
                                            <span>Share</span>
                                        </button>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-red-500 focus:text-red-500 cursor-pointer" onClick={logout}>
                                        <LogOut className="mr-2 h-4 w-4" />
                                        <span>Log out</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <div className="flex items-center space-x-2">
                                <Button variant="ghost" size="sm" asChild>
                                    <Link href="/login">Log in</Link>
                                </Button>
                                <Button size="sm" asChild>
                                    <Link href="/register">Sign up</Link>
                                </Button>
                            </div>
                        )}
                    </nav>
                </div>

            </div>
        </header>
    );
}
