"use client"

import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"

interface SidebarToggleProps {
  open: boolean
  setOpen: (open: boolean) => void
}

export function SidebarToggle({ open, setOpen }: SidebarToggleProps) {
  return (
    <Button
      variant="outline"
      size="icon"
      className="fixed top-4 left-4 z-40 bg-background/80 backdrop-blur-sm"
      onClick={() => setOpen(!open)}
    >
      <Menu className="h-5 w-5" />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  )
}

