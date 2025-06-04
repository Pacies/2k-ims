"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface YouTubeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  productName: string
}

export default function YouTubeModal({ open, onOpenChange, productName }: YouTubeModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{productName} Tutorial</DialogTitle>
        </DialogHeader>
        <div className="aspect-video w-full overflow-hidden rounded-md">
          <iframe
            width="100%"
            height="100%"
            src="https://www.youtube.com/embed/dQw4w9WgXcQ"
            title={`${productName} Tutorial`}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          ></iframe>
        </div>
      </DialogContent>
    </Dialog>
  )
}
