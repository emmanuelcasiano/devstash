"use client"

import { Toaster as SonnerToaster } from "sonner"

/**
 * App-wide toast host. DevStash renders dark-only (the `dark` class is fixed on
 * `<html>`), so the theme is hardcoded rather than pulled from `next-themes`.
 */
function Toaster(props: React.ComponentProps<typeof SonnerToaster>) {
  return (
    <SonnerToaster
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
