"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AvatarEditor from "react-avatar-editor";
import { toast } from "sonner";
import { API_ENDPOINTS, getImageUrl } from "@/lib/api-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Mail, User, Shield, Key, Bell, Camera, Check, ExternalLink, Zap, CreditCard, LogOut, Loader2, CalendarIcon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ShareDialog } from "@/components/share-dialog";
import { Share2 } from "lucide-react";
export default function ProfilePage() {
    const [activeTab, setActiveTab] = useState("general");
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState({
        first_name: "",
        last_name: "",
        username: "",
        email: "",
        profile_picture: "",
        dob: ""
    });
    const { token, logout, loading } = useAuth();
    const [isShareOpen, setIsShareOpen] = useState(false);

    // Avatar upload states
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [imgFile, setImgFile] = useState<File | null>(null);
    const [imgUrl, setImgUrl] = useState<string>("");
    const [isCropModalOpen, setIsCropModalOpen] = useState(false);
    const [scale, setScale] = useState(1.2);
    const editorRef = useRef<AvatarEditor | null>(null);

    const tabs = [
        { id: "general", label: "General", icon: User },
        { id: "notifications", label: "Notifications", icon: Bell },
    ];

    useEffect(() => {
        if (!token) {
            setIsLoading(false);
            return;
        }
        fetch(API_ENDPOINTS.user.profile, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
            .then(res => res.json())
            .then(data => {
                if (data && !data.error) {
                    setUser({
                        first_name: data.first_name || "",
                        last_name: data.last_name || "",
                        username: data.username || "",
                        email: data.email || "",
                        profile_picture: getImageUrl(data.profile_picture),
                        dob: data.dob || ""
                    });
                }
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch profile:", err);
                setIsLoading(false);
                toast.error("Failed to load profile data.");
            });
    }, [token]);

    const isBirthday = React.useMemo(() => {
        if (!user.dob) return false;
        const today = new Date();
        const dobDate = new Date(user.dob);
        return today.getDate() === dobDate.getDate() && today.getMonth() === dobDate.getMonth();
    }, [user.dob]);

    useEffect(() => {
        if (isBirthday) {
            const birthdayShown = sessionStorage.getItem('birthdayShown');
            if (!birthdayShown) {
                toast.success("🎉 Happy Birthday! 🎂 We hope you have a fantastic day!", {
                    duration: 10000,
                    position: "top-center"
                });
                sessionStorage.setItem('birthdayShown', 'true');
            }
        }
    }, [isBirthday]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        // Transform the DOM id to db column name (e.g. first-name -> first_name)
        const key = id.replace("-", "_");
        setUser(prev => ({ ...prev, [key]: value }));
    };

    const handleSaveProfile = async () => {
        try {
            const res = await fetch(API_ENDPOINTS.user.profile, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    first_name: user.first_name,
                    last_name: user.last_name,
                    username: user.username,
                    email: user.email,
                    dob: user.dob
                })
            });
            if (res.ok) {
                toast.success("Profile saved successfully!");
                window.dispatchEvent(new CustomEvent('profile-updated'));
            } else {
                toast.error("Failed to update profile.");
            }
        } catch (err) {
            toast.error("An error occurred while saving.");
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setImgFile(file);
            setImgUrl(URL.createObjectURL(file));
            setScale(1.2);
            setIsCropModalOpen(true);
            // Reset input so selecting the same file triggers onChange again
            e.target.value = "";
        }
    };

    const handleSaveAvatar = async () => {
        if (editorRef.current) {
            const canvasScaled = editorRef.current.getImageScaledToCanvas();
            canvasScaled.toBlob(async (blob) => {
                if (!blob) return;
                const formData = new FormData();
                formData.append("avatar", blob, imgFile?.name || "avatar.png");

                try {
                    setIsCropModalOpen(false);
                    const toastId = toast.loading("Uploading avatar...");
                    const res = await fetch(API_ENDPOINTS.user.avatar, {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${token}`
                        },
                        body: formData
                    });
                    if (res.ok) {
                        const data = await res.json();
                        setUser(prev => ({ ...prev, profile_picture: getImageUrl(data.profile_picture) + `?t=${Date.now()}` }));
                        toast.success("Avatar updated!", { id: toastId });
                        window.dispatchEvent(new CustomEvent('profile-updated'));
                    } else {
                        toast.error("Failed to upload avatar.", { id: toastId });
                    }
                } catch (err) {
                    console.error("Avatar upload error:", err);
                    toast.error("An error occurred during upload.");
                }
            });
        }
    };

    const handleRemoveAvatar = async () => {
        try {
            const toastId = toast.loading("Removing avatar...");
            const res = await fetch(API_ENDPOINTS.user.avatar, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            if (res.ok) {
                setUser(prev => ({ ...prev, profile_picture: "" }));
                toast.success("Avatar removed!", { id: toastId });
                window.dispatchEvent(new CustomEvent('profile-updated'));
            } else {
                toast.error("Failed to remove avatar.", { id: toastId });
            }
        } catch (err) {
            console.error("Avatar removal error:", err);
            toast.error("An error occurred while removing avatar.");
        }
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case "general":
                return (
                    <motion.div
                        key="general"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-8"
                    >
                        {/* Public Profile Section */}
                        <Card className="border-border/50 shadow-sm transition-all hover:shadow-md backdrop-blur-sm bg-card/95">
                            <CardHeader>
                                <CardTitle>Public Profile</CardTitle>
                                <CardDescription>
                                    This information will be displayed publicly so be careful what you share.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex flex-col sm:flex-row items-center gap-6">
                                    <div
                                        className="relative inline-block"
                                    >
                                        <Avatar className="h-24 w-24 border-4 border-background shadow-xl">
                                            <AvatarImage src={user.profile_picture || "https://github.com/shadcn.png"} alt="Avatar" />
                                            <AvatarFallback className="bg-primary/10 text-primary text-xl">
                                                {(user.first_name?.[0] || 'A') + (user.last_name?.[0] || 'S')}
                                            </AvatarFallback>
                                        </Avatar>
                                    </div>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                    />

                                    <div className="space-y-1 text-center sm:text-left flex-1">
                                        <h3 className="font-medium text-foreground text-lg">Profile Picture</h3>
                                        <p className="text-sm text-muted-foreground">
                                            JPG, GIF or PNG. 1MB max.
                                        </p>
                                        <div className="pt-2 flex flex-wrap gap-2 justify-center sm:justify-start">
                                            <Button variant="outline" size="sm" className="shadow-sm" onClick={() => fileInputRef.current?.click()}>Upload new</Button>
                                            <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={handleRemoveAvatar}>Remove</Button>
                                        </div>
                                    </div>
                                </div>

                                <Separator className="bg-border/50" />

                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="first-name">First Name</Label>
                                        <Input id="first-name" placeholder="John" value={user.first_name} onChange={handleChange} className="bg-background/50 focus:bg-background transition-colors" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="last-name">Last Name</Label>
                                        <Input id="last-name" placeholder="Doe" value={user.last_name} onChange={handleChange} className="bg-background/50 focus:bg-background transition-colors" />
                                    </div>
                                </div>

                                <div className="grid gap-5 sm:grid-cols-2 mt-5">
                                    <div className="space-y-2">
                                        <Label htmlFor="username">Username</Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-muted-foreground text-sm font-semibold">@</span>
                                            <Input id="username" placeholder="johndoe" value={user.username} onChange={handleChange} className="pl-8 bg-background/50 focus:bg-background transition-colors focus-visible:ring-primary" />
                                        </div>
                                        <p className="text-[13px] text-muted-foreground flex items-center gap-1 mt-1">
                                            Your profile URL: <span className="text-foreground">vextron.ai/@{user.username || "username"}</span>
                                            <ExternalLink className="h-3 w-3 inline cursor-pointer text-muted-foreground hover:text-primary transition-colors" />
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Date of Birth</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full justify-start text-left font-normal bg-background/50 focus:bg-background transition-colors",
                                                        !user.dob && "text-muted-foreground"
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {user.dob ? format(new Date(user.dob), "PPP") : <span>Pick a date</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={user.dob ? new Date(user.dob) : undefined}
                                                    onSelect={(date) => setUser(prev => ({ ...prev, dob: date ? date.toISOString() : "" }))}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="bg-muted/30 border-t border-border/50 flex justify-end gap-2 p-4">
                                <Button variant="ghost">Discard</Button>
                                <Button onClick={handleSaveProfile} className="shadow-md shadow-primary/20 transition-all hover:shadow-primary/40">Save Changes</Button>
                            </CardFooter>
                        </Card>

                        {/* Email Settings Section */}
                        <Card className="border-border/50 shadow-sm transition-all hover:shadow-md backdrop-blur-sm bg-card/95">
                            <CardHeader>
                                <CardTitle>Email Addresses</CardTitle>
                                <CardDescription>
                                    Manage your email addresses and preferences.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border border-border/50 rounded-xl bg-background/50 gap-4 transition-all hover:border-primary/30">
                                    <div className="flex items-center gap-3 w-full">
                                        <div className="bg-primary/10 p-2.5 rounded-full ring-1 ring-primary/20 shrink-0">
                                            <Mail className="h-4 w-4 text-primary" />
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <Input id="email" value={user.email} onChange={handleChange} className="bg-background/50 font-medium text-sm text-foreground focus:bg-background w-full max-w-sm" />
                                            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                                <span className="relative flex h-2 w-2">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                                </span>
                                                Primary Email
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="bg-muted/30 border-t border-border/50 flex justify-end gap-2 p-4">
                                <Button onClick={handleSaveProfile}>Update Email</Button>
                            </CardFooter>
                        </Card>
                    </motion.div>
                );

            case "notifications":
                return (
                    <motion.div
                        key="notifications"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-8"
                    >
                        {isBirthday && (
                            <Card className="border-primary/50 bg-primary/5 shadow-md shadow-primary/10 transition-all hover:shadow-primary/20">
                                <CardContent className="flex items-center gap-4 p-6">
                                    <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                        <Zap className="h-6 w-6 text-primary" />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-xl font-semibold text-foreground">Happy Birthday, {user.first_name || "User"}! 🎉</h3>
                                        <p className="text-muted-foreground text-sm">
                                            Wishing you a fantastic day ahead! We&apos;re glad to have you with us. 🎂
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                        <Card className="border-dashed border-2 border-border/50 bg-transparent shadow-none">
                            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                    <Bell className="h-6 w-6 text-primary" />
                                </div>
                                <h3 className="text-xl font-medium">{isBirthday ? "No other notifications" : "No new notifications"}</h3>
                                <p className="text-muted-foreground mt-2 max-w-sm">
                                    You&apos;re all caught up! Check back later for new alerts and updates.
                                </p>
                            </CardContent>
                        </Card>
                    </motion.div>
                );

            default:
                return (
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-8"
                    >
                        <Card className="border-dashed border-2 border-border/50 bg-transparent shadow-none">
                            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                    <Shield className="h-6 w-6 text-primary" />
                                </div>
                                <h3 className="text-xl font-medium">Coming Soon</h3>
                                <p className="text-muted-foreground mt-2 max-w-sm">
                                    We&apos;re still working on this section. Check back later for updates to these settings.
                                </p>
                            </CardContent>
                        </Card>
                    </motion.div>
                );
        }
    };

    if (isLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <p>Please log in to view your profile.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background relative overflow-hidden pb-20">
            {/* Background Decorations */}
            <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none -z-10" />
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl opacity-50 pointer-events-none -z-10 translate-x-1/2 -translate-y-1/2" />

            {/* Elegant Banner */}
            <div className="h-48 w-full bg-gradient-to-r from-blue-600/90 via-indigo-600/90 to-purple-600/90 relative">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent"></div>
            </div>

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl -mt-20 relative z-10">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row items-center md:items-end justify-between gap-6 mb-12">
                    <div className="flex flex-col md:flex-row items-center md:items-end gap-6 w-full text-center md:text-left">
                        <Avatar className="h-32 w-32 border-4 border-background shadow-2xl bg-muted">
                            <AvatarImage src={user.profile_picture || "https://github.com/shadcn.png"} alt="Avatar" />
                            <AvatarFallback className="text-3xl text-primary font-light">
                                {(user.first_name?.[0] || 'A') + (user.last_name?.[0] || 'S')}
                            </AvatarFallback>
                        </Avatar>
                        <div className="pb-2 space-y-1">
                            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                                {user.first_name || "Anil"} {user.last_name || "Sai"}
                            </h1>
                            <p className="text-lg text-muted-foreground font-medium flex items-center justify-center md:justify-start gap-2">
                                @{user.username || "anilsai"}
                                <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">Pro Plan</span>
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Button 
                            variant="outline" 
                            className="gap-2 border-primary/20 hover:bg-primary/5 transition-all shadow-sm"
                            onClick={() => setIsShareOpen(true)}
                        >
                            <Share2 className="h-4 w-4" />
                            Share Profile
                        </Button>
                    </div>
                </div>
                <ShareDialog isOpen={isShareOpen} onOpenChange={setIsShareOpen} />

                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                    {/* Navigation Sidebar */}
                    <div className="md:col-span-3 lg:col-span-3">
                        <div className="sticky top-24">
                            <nav className="flex flex-row md:flex-col gap-1 overflow-x-auto pb-4 md:pb-0 scrollbar-hide">
                                {tabs.map((tab) => {
                                    const Icon = tab.icon;
                                    const isActive = activeTab === tab.id;
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`relative flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap text-left w-full
                                                ${isActive
                                                    ? 'text-primary bg-primary/10 shadow-sm'
                                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                                }`}
                                        >
                                            <Icon className={`h-4 w-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                                            {tab.label}
                                            {isActive && (
                                                <motion.div
                                                    layoutId="activeTabIndicator"
                                                    className="absolute inset-0 border-2 border-primary/20 rounded-lg"
                                                    initial={false}
                                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                                />
                                            )}
                                        </button>
                                    );
                                })}

                                <Separator className="my-2 hidden md:block" />

                                <button className="hidden md:flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors w-full text-left" onClick={logout}>
                                    <LogOut className="h-4 w-4" />
                                    Log out
                                </button>
                            </nav>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="md:col-span-9 lg:col-span-8 lg:col-start-4">
                        <AnimatePresence mode="wait">
                            {renderTabContent()}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Crop Settings Modal */}
            <Dialog open={isCropModalOpen} onOpenChange={setIsCropModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Adjust Image</DialogTitle>
                        <DialogDescription>
                            Crop and zoom your new profile picture before saving.
                        </DialogDescription>
                    </DialogHeader>
                    {imgUrl && (
                        <div className="flex flex-col items-center justify-center space-y-4 py-4">
                            <div className="relative rounded-lg overflow-hidden border">
                                <AvatarEditor
                                    ref={editorRef}
                                    image={imgUrl}
                                    width={250}
                                    height={250}
                                    border={30}
                                    borderRadius={125} // half of 250 for perfect circle
                                    color={[0, 0, 0, 0.6]} // RGBA
                                    scale={scale}
                                    rotate={0}
                                />
                            </div>
                            <div className="w-full max-w-[250px] space-y-2">
                                <Label className="text-sm text-muted-foreground">Zoom</Label>
                                <input
                                    type="range"
                                    min="1"
                                    max="2"
                                    step="0.01"
                                    value={scale}
                                    onChange={(e) => setScale(parseFloat(e.target.value))}
                                    className="w-full accent-primary"
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCropModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveAvatar}>Upload Photo</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}
