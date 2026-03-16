"use client";

import Link from "next/link";
import { Github, Twitter, Linkedin, Mail, Sparkles, Users } from "lucide-react";
import CountUp from "react-countup";
import { useEffect, useState } from "react";
import { API_ENDPOINTS } from "@/lib/api-config";

export default function Footer() {
    const [mounted, setMounted] = useState(false);
    const [visitorCount, setVisitorCount] = useState<number | null>(null);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);

        const hasVisited = sessionStorage.getItem('hasVisited');

        if (!hasVisited) {
            // First time this session, increment and fetch count
            fetch(API_ENDPOINTS.visitors, { method: 'POST' })
                .then(res => res.json())
                .then(data => {
                    if (data.count !== undefined) {
                        setVisitorCount(data.count);
                        sessionStorage.setItem('hasVisited', 'true');
                    }
                })
                .catch(err => console.error("Failed to update visitor count:", err));
        } else {
            // Already visited this session, just fetch the current count
            fetch(API_ENDPOINTS.visitors)
                .then(res => res.json())
                .then(data => {
                    if (data.count !== undefined) {
                        setVisitorCount(data.count);
                    }
                })
                .catch(err => console.error("Failed to fetch visitor count:", err));
        }
    }, []);

    return (
        <footer className="w-full bg-background border-t border-border mt-auto">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 pb-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 lg:gap-12 mb-12">
                    {/* Brand & Description */}
                    <div className="flex flex-col gap-5 items-start">
                        <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
                            <div className="rounded-xl bg-primary/10 p-2 text-primary flex items-center justify-center">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <span className="font-bold text-xl tracking-tight text-foreground">ChatBot AI</span>
                        </Link>
                        <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
                            Empowering your workflow with intelligent conversations. Experience the next generation of AI assistance.
                        </p>
                        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground font-medium bg-secondary/50 px-4 py-2 rounded-lg w-fit border border-border">
                            <Users className="w-4 h-4 text-primary" />
                            <span>no of visitors : </span>
                            {mounted && (
                                <span className="text-primary font-bold min-w-[30px] inline-block text-left">
                                    {visitorCount !== null ? (
                                        <CountUp end={visitorCount} duration={2.5} separator="," />
                                    ) : (
                                        "..."
                                    )}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Links Column 2 */}
                    <div className="flex flex-col gap-5 sm:items-start">
                        <h3 className="font-semibold text-foreground tracking-wide">Quick Links</h3>
                        <ul className="flex flex-col gap-3 text-sm text-muted-foreground">
                            <li><Link href="/" className="hover:text-primary transition-colors">Home</Link></li>
                            <li><Link href="/profile" className="hover:text-primary transition-colors">Profile</Link></li>
                            <li><Link href="/workspace" className="hover:text-primary transition-colors">WorkSpace</Link></li>

                        </ul>
                    </div>

                    {/* Links Column 3 */}
                    <div className="flex flex-col gap-5 sm:items-start">
                        <h3 className="font-semibold text-foreground tracking-wide">Developer</h3>
                        <ul className="flex flex-col gap-3 text-sm text-muted-foreground">
                            <li><Link href="https://github.com/anilsainunna" target="_blank" className="hover:text-primary transition-colors flex items-center gap-2"><Github className="w-4 h-4" /> GitHub</Link></li>
                            <li><Link href="https://twitter.com" target="_blank" className="hover:text-primary transition-colors flex items-center gap-2"><Twitter className="w-4 h-4" /> Twitter</Link></li>
                            <li><Link href="https://linkedin.com/in/anilsainunna" target="_blank" className="hover:text-primary transition-colors flex items-center gap-2"><Linkedin className="w-4 h-4" /> LinkedIn</Link></li>
                            <li><Link href="mailto:anilsainunna@gmail.com" className="hover:text-primary transition-colors flex items-center gap-2"><Mail className="w-4 h-4" /> Contact</Link></li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center md:items-center gap-6 text-center md:text-left">
                    <p className="text-sm text-muted-foreground">
                        © {new Date().getFullYear()} ChatBot AI. All rights reserved.
                    </p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div>
                            Developed by{" "}
                            <span className="relative inline-block group">
                                <Link
                                    href="https://linkedin.com/in/anilsainunna"
                                    target="_blank"
                                    className="font-medium text-foreground hover:text-primary transition-colors"
                                >
                                    Anil Sai
                                </Link>

                                {/* Portfolio Tooltip - Premium SaaS Style */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 flex flex-col items-center opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 ease-out pointer-events-none">

                                    <Link
                                        href="https://anilsai-portfolio.vercel.app/"
                                        target="_blank"
                                        className="px-4 py-1.5 text-xs font-medium 
                                                   bg-white/10 backdrop-blur-md 
                                                   border border-white/20 
                                                   text-foreground 
                                                   rounded-lg shadow-xl 
                                                   whitespace-nowrap 
                                                   pointer-events-auto
                                                   hover:bg-white/20 
                                                   transition-colors duration-300"
                                    >
                                        View Portfolio
                                    </Link>

                                    {/* Glass Arrow */}
                                    <div className="w-3 h-3 bg-white/10 backdrop-blur-md border-r border-b border-white/20 rotate-45 -mt-2 shadow-md"></div>
                                </div>
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}