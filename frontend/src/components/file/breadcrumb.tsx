"use client";

import { useFileStore } from "@/store/fileStore";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbProps {
  onNavigate: (folderId: string | null) => void;
}

export function Breadcrumb({ onNavigate }: BreadcrumbProps) {
  const { currentFolderId, breadcrumb } = useFileStore();

  if (!currentFolderId) {
    return (
      <div className="flex items-center gap-2 text-sm text-body-mid px-6 py-3 border-b border-hairline">
        <Home className="w-3.5 h-3.5" />
        <span className="eyebrow-mono-sm">My Files</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 text-sm px-6 py-3 border-b border-hairline flex-wrap">
      <button
        className="flex items-center gap-1.5 text-body-mid hover:text-ink transition-colors px-1 py-0.5 rounded-sm"
        onClick={() => onNavigate(null)}
      >
        <Home className="w-3.5 h-3.5" />
        <span className="text-xs">My Files</span>
      </button>

      {breadcrumb.map((item, index) => (
        <div key={item.id} className="flex items-center gap-1">
          <ChevronRight className="w-3 h-3 text-body-mid" />
          <button
            className={`px-1 py-0.5 rounded-sm transition-colors text-xs ${
              index === breadcrumb.length - 1
                ? "text-ink"
                : "text-body-mid hover:text-ink"
            }`}
            onClick={() => {
              if (index === breadcrumb.length - 1) return;
              onNavigate(item.id);
            }}
          >
            {item.name}
          </button>
        </div>
      ))}
    </div>
  );
}
