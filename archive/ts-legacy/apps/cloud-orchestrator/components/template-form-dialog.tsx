"use client";

import { useState, useEffect } from "react";
import { SessionTemplate } from '@jules/shared';
import { useJules } from "@/lib/jules/provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { X } from "lucide-react";

interface TemplateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: SessionTemplate | null;
  onSave: () => void;
  initialValues?: Partial<SessionTemplate>;
}

export function TemplateFormDialog({
  open,
  onOpenChange,
  template,
  onSave,
  initialValues,
}: TemplateFormDialogProps) {
  const { client } = useJules();
  const [tagInput, setTagInput] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    prompt: "",
    title: "",
    tags: [] as string[],
  });

  // Reset form when dialog opens or template changes
  useEffect(() => {
    if (open) {
      // Use a timeout to push this to the next tick, avoiding synchronous state updates during render phase
      // if this effect was triggered by a parent render
      const timer = setTimeout(() => {
        if (template) {
          setFormData({
            name: template.isPrebuilt ? `${template.name} (Copy)` : template.name,
            description: template.description,
            prompt: template.prompt,
            title: template.title || "",
            tags: template.tags || [],
          });
        } else if (initialValues) {
          setFormData({
            name: initialValues.name || "",
            description: initialValues.description || "",
            prompt: initialValues.prompt || "",
            title: initialValues.title || "",
            tags: initialValues.tags || [],
          });
        } else {
          setFormData({
            name: "",
            description: "",
            prompt: "",
            title: "",
            tags: [],
          });
        }
        setTagInput("");
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [open, template, initialValues]);

  const isPrebuilt = template?.isPrebuilt;

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (newTag && !formData.tags.includes(newTag)) {
        setFormData((prev) => ({ ...prev, tags: [...prev.tags, newTag] }));
        setTagInput("");
      }
    } else if (e.key === "Backspace" && !tagInput && formData.tags.length > 0) {
      setFormData((prev) => ({ ...prev, tags: prev.tags.slice(0, -1) }));
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tagToRemove),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;

    try {
      const data = {
        name: formData.name,
        description: formData.description,
        prompt: formData.prompt,
        title: formData.title,
        tags: formData.tags,
      };

      if (template?.id && !isPrebuilt) {
        await client.updateTemplate(template.id, data);
      } else {
        await client.createTemplate(data);
      }

      onSave();
      onOpenChange(false);
      toast.success(
        isPrebuilt ? "Template cloned successfully" : "Template saved successfully"
      );
    } catch (error) {
      console.error("Failed to save template:", error);
      toast.error("Failed to save template");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.15)] bg-zinc-950 text-white" aria-describedby="template-form-description">
        <DialogHeader>
          <DialogTitle>
            {template
              ? isPrebuilt
                ? "Clone System Template"
                : "Edit Template"
              : "Create New Template"}
          </DialogTitle>
          <DialogDescription id="template-form-description">
            {template
              ? isPrebuilt
                ? "This is a system template. Saving will create a customizable copy."
                : "Update the details for this session template."
              : "Configure a new template for quick session creation."}
          </DialogDescription>
        </DialogHeader>

        <form
          id="template-form"
          onSubmit={handleSubmit}
          className="space-y-4 pt-2"
        >
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-semibold">
              Template Name
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="e.g., React Component Refactor"
              className="h-9 text-xs bg-zinc-900 border-zinc-700"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs font-semibold">
              Description
            </Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Brief description of what this template does"
              className="h-9 text-xs bg-zinc-900 border-zinc-700"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-xs font-semibold">
              Default Session Title (Optional)
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="e.g., Refactor Component"
              className="h-9 text-xs bg-zinc-900 border-zinc-700"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tags" className="text-xs font-semibold">
              Tags
            </Label>
            <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-background min-h-[38px] focus-within:ring-1 focus-within:ring-ring">
              {formData.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-[10px] h-5 px-1.5 gap-1"
                >
                  {tag}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-destructive"
                    onClick={() => removeTag(tag)}
                  />
                </Badge>
              ))}
              <input
                id="tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder={
                  formData.tags.length === 0
                    ? "e.g., frontend, refactor (Press Enter)"
                    : ""
                }
                className="flex-1 bg-transparent border-none outline-none text-xs min-w-[120px] h-5"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prompt" className="text-xs font-semibold">
              Prompt Instructions
            </Label>
            <Textarea
              id="prompt"
              value={formData.prompt}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, prompt: e.target.value }))
              }
              placeholder="Enter the detailed instructions for Jules..."
              className="min-h-[100px] h-[200px] max-h-[300px] overflow-y-auto text-xs font-mono bg-zinc-900 border-zinc-700"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="h-8 text-[10px] font-mono uppercase tracking-widest"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="h-8 text-[10px] font-mono uppercase tracking-widest"
            >
              {template
                ? isPrebuilt
                  ? "Clone Template"
                  : "Save Changes"
                : "Create Template"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
