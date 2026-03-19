"use client";

import React, { useEffect, useRef, useState } from "react";
import QRCodeStyling, {
  Options,
} from "qr-code-styling";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Share, Download, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface ShareDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  url?: string;
}

export function ShareDialog({ isOpen, onOpenChange, url }: ShareDialogProps) {
  const qrCodeRef = useRef<any>(null);
  const [copied, setCopied] = useState(false);
  const [qrSvg, setQrSvg] = useState<string>("");
  const shareUrl = url || (typeof window !== "undefined" ? window.location.origin : "https://vextron.ai");

  const [isRendering, setIsRendering] = useState(false);

  useEffect(() => {
    // Only proceed on client-side
    if (typeof window === "undefined" || !isOpen) return;

    setIsRendering(true);

    const renderQR = async () => {
      try {
        const QRCodeStylingLib = (await import("qr-code-styling")).default;
        
        const qr = new QRCodeStylingLib({
          width: 300,
          height: 300,
          type: "svg",
          data: shareUrl,
          image: "/og-image-square.png",
          dotsOptions: {
            color: "#1d4ed8",
            type: "rounded",
          },
          backgroundOptions: {
            color: "#ffffff",
          },
          imageOptions: {
            margin: 10,
            imageSize: 0.4,
            hideBackgroundDots: true,
          },
          cornersSquareOptions: {
            type: "extra-rounded",
            color: "#1e3a8a",
          },
          cornersDotOptions: {
            type: "dot",
            color: "#1e40af",
          },
          qrOptions: {
            errorCorrectionLevel: "Q",
          },
        });
        
        qrCodeRef.current = qr;
        const svgBlob = await qr.getRawData("svg");
        if (svgBlob) {
          const reader = new FileReader();
          reader.onload = () => {
            setQrSvg(reader.result as string);
            setIsRendering(false);
          };
          reader.readAsText(svgBlob as Blob);
        }
      } catch (err) {
        console.error("QR Code rendering failed:", err);
        setIsRendering(false);
      }
    };

    renderQR();
  }, [isOpen, shareUrl]);

  // Removed redundant second useEffect

  const handleDownload = () => {
    if (qrCodeRef.current) {
      qrCodeRef.current.download({
        name: "vextron-ai-qr",
        extension: "png",
      });
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy link.");
    }
  };

  const handleShareSystem = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Vextron AI",
          text: "Check out Vextron AI - Intelligent Conversational Interface",
          url: shareUrl,
        });
      } catch (err) {
        console.error("Error sharing:", err);
      }
    } else {
        handleCopy();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">Share Vextron AI</DialogTitle>
          <DialogDescription className="text-center">
            Invite others to join the conversation.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center p-6 space-y-6">
          <div className="bg-white p-4 rounded-2xl shadow-xl border-4 border-primary/10 overflow-hidden min-h-[312px] min-w-[312px] flex items-center justify-center relative">
            {isRendering && !qrSvg && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/50 animate-pulse">
                    <span className="text-sm text-primary font-medium">Generating QR...</span>
                </div>
            )}
            {qrSvg && (
                <div 
                    dangerouslySetInnerHTML={{ __html: qrSvg }} 
                    className="w-[300px] h-[300px]"
                />
            )}
          </div>
          
          <div className="w-full flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-border/50">
             <span className="flex-1 truncate text-sm font-medium text-muted-foreground">{shareUrl}</span>
             <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
             </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-4 w-full">
            <Button 
                variant="outline" 
                className="gap-2 h-12 border-primary/20 hover:bg-primary/5 transition-all"
                onClick={handleDownload}
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
            <Button 
                className="gap-2 h-12 shadow-lg shadow-primary/20 transition-all hover:shadow-primary/40"
                onClick={handleShareSystem}
            >
              <Share className="h-4 w-4" />
              Share App
            </Button>
          </div>
        </div>
        <DialogFooter className="sm:justify-center text-xs text-muted-foreground border-t border-border/50 pt-4">
            Scan with your camera to open instantly
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
