"use client";

import * as React from "react";
import { Check, Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const themes = [
  { name: "Purple", value: "theme-purple", color: "bg-purple-600" },
  { name: "Blue", value: "theme-blue", color: "bg-blue-600" },
  { name: "Green", value: "theme-green", color: "bg-green-600" },
  { name: "Orange", value: "theme-orange", color: "bg-orange-600" },
  { name: "Red", value: "theme-red", color: "bg-red-600" },
  { name: "Slate", value: "theme-slate", color: "bg-slate-600" },
];

export function ThemeCustomizer() {
  const { theme, setTheme } = useTheme();
  const [colorTheme, setColorTheme] = React.useState("theme-purple");

  React.useEffect(() => {
    const savedTheme = localStorage.getItem("jules-color-theme");
    if (savedTheme) {
      setColorTheme(savedTheme);
      // Ensure class is applied on mount
      themes.forEach((t) => document.body.classList.remove(t.value));
      if (savedTheme !== "theme-purple") {
        document.body.classList.add(savedTheme);
      }
    }
  }, []);

  const handleColorChange = (newTheme: string) => {
    // Remove old theme
    themes.forEach((t) => document.body.classList.remove(t.value));
    // Add new theme (unless it's default purple which has no class)
    if (newTheme !== "theme-purple") {
        document.body.classList.add(newTheme);
    }
    
    setColorTheme(newTheme);
    localStorage.setItem("jules-color-theme", newTheme);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label className="text-xs text-white/60">Mode</Label>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className={cn("flex-1", theme === "light" && "border-primary bg-primary/10")}
            onClick={() => setTheme("light")}
          >
            <Sun className="mr-2 h-4 w-4" />
            Light
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={cn("flex-1", theme === "dark" && "border-primary bg-primary/10")}
            onClick={() => setTheme("dark")}
          >
            <Moon className="mr-2 h-4 w-4" />
            Dark
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={cn("flex-1", theme === "system" && "border-primary bg-primary/10")}
            onClick={() => setTheme("system")}
          >
            <Monitor className="mr-2 h-4 w-4" />
            System
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-white/60">Accent Color</Label>
        <div className="grid grid-cols-3 gap-2">
          {themes.map((t) => (
            <Button
              key={t.name}
              variant="outline"
              size="sm"
              className={cn(
                "justify-start",
                colorTheme === t.value && "border-primary bg-primary/10"
              )}
              onClick={() => handleColorChange(t.value)}
            >
              <span className={cn("mr-2 h-4 w-4 rounded-full", t.color)} />
              {t.name}
              {colorTheme === t.value && <Check className="ml-auto h-4 w-4" />}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
