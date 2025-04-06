import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function extractTitleFromHTML(html: string): string | null {
  const titleMatch = html.match(/<title>(.*?)<\/title>/i)
  return titleMatch ? titleMatch[1] : null
}

