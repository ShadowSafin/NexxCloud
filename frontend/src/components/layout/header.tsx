"use client";

import { useState, useRef, useEffect } from "react";
import { useFileStore } from "@/store/fileStore";
import { useAuthStore } from "@/store/authStore";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Search,
  Grid3X3,
  List,
  LogOut,
  FolderPlus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  ChevronDown,
  Globe,
  Menu,
  MoreVertical,
} from "lucide-react";

interface HeaderProps {
  onUploadClick: () => void;
  onNewFolderClick: () => void;
  onSearchChange?: (query: string) => void;
  onToggleSidebar?: () => void;
}

const SORT_OPTIONS = [
  { value: "name", label: "Name" },
  { value: "date", label: "Modified date" },
  { value: "size", label: "Size" },
  { value: "type", label: "Type" },
] as const;

export function Header({ onUploadClick, onNewFolderClick, onSearchChange, onToggleSidebar }: HeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = searchParams.get("view");
  const { viewMode, setViewMode, sortBy, setSortBy, sortOrder, setSortOrder, breadcrumb } = useFileStore();
  const { logout } = useAuthStore();
  const [search, setSearch] = useState("");
  const [sortOpen, setSortOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  const currentSortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label || "Name";

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchInput = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSearchChange?.(value);
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const handleSortChange = (newSortBy: typeof sortBy) => {
    if (newSortBy === sortBy) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(newSortBy);
      setSortOrder(newSortBy === "name" ? "asc" : "desc");
    }
    setSortOpen(false);
  };

  const handleMenuAction = (action: () => void) => {
    action();
    setMenuOpen(false);
  };

  // Determine active view label
  let pathText = "drive";
  if (view === "trash") pathText = "trash";
  else if (view === "recent") pathText = "recent";
  else if (view === "starred") pathText = "starred";
  else if (view === "shared") pathText = "shared";
  else if (view === "media") pathText = "media";

  const currentFolderName = breadcrumb.length > 0 ? breadcrumb[breadcrumb.length - 1]?.name : null;

  return (
    <header className="min-h-14 border-b border-white/[0.06] bg-black/25 px-2.5 py-2.5 backdrop-blur-md sm:px-6 md:h-14 md:py-0 flex items-center justify-between shrink-0 relative z-20 safe-pt">
      {/* Left: Hamburger menu, macOS dots & dynamic Address Bar */}
      <div className="flex items-center gap-1.5 md:gap-4">
        {/* Hamburger Menu Icon for Mobile */}
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-lg hover:bg-white/[0.04] border border-transparent hover:border-white/[0.06] transition-all md:hidden text-white/70 hover:text-white"
          aria-label="Toggle Menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Fake macOS Traffic lights (Desktop only) */}
        <div className="hidden md:flex items-center gap-1.5 pr-2">
          <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] cursor-default opacity-85 hover:opacity-100 transition-opacity" />
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123] cursor-default opacity-85 hover:opacity-100 transition-opacity" />
          <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29] cursor-default opacity-85 hover:opacity-100 transition-opacity" />
        </div>

        {/* Desktop Address Bar */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/35 border border-white/[0.05] text-xs text-white/90">
          <Globe className="w-3 h-3 text-cyan-400/80 glow-cyan animate-pulse" />
          <span className="text-white/50 font-medium">nexxcloud.local</span>
          <span className="text-white/25 font-light">/</span>
          <span className="text-white/70 font-semibold">{pathText}</span>
          {currentFolderName && (
            <>
              <span className="text-white/25 font-light">/</span>
              <span className="text-purple-400 font-bold max-w-[120px] truncate">{currentFolderName}</span>
            </>
          )}
        </div>

        {/* Mobile Address Bar (Simplified) */}
        <div className="flex md:hidden items-center gap-1 px-2 py-1 rounded-full bg-black/35 border border-white/[0.05] text-[10px] text-white/90">
          <span className="text-white/70 font-semibold truncate max-w-[76px] sm:max-w-[110px]">
            {currentFolderName || pathText}
          </span>
        </div>
      </div>

      {/* Right: Search, Tools, and Profile logout */}
      <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
        {/* Search Input */}
        <div className="relative flex items-center w-24 min-w-[82px] transition-all duration-300 sm:w-40 md:w-56 max-[380px]:hidden">
          <Search className="absolute left-2.5 w-3.5 h-3.5 text-white/40 pointer-events-none" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => handleSearchInput(e.target.value)}
            className="w-full bg-white/[0.02] hover:bg-white/[0.04] focus:bg-black/40 border border-white/[0.06] focus:border-purple-500/50 rounded-full pl-8 pr-7 py-1.5 text-xs text-white placeholder-white/30 outline-none transition-all"
          />
          {search && (
            <button
              onClick={() => { setSearch(""); onSearchChange?.(""); }}
              className="absolute right-2.5 text-white/40 hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* View mode toggle */}
        <div className="flex items-center bg-white/[0.02] border border-white/[0.06] rounded-full p-0.5 max-[380px]:hidden">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded-full transition-all ${viewMode === "grid" ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white"}`}
            title="Grid view"
          >
            <Grid3X3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-1.5 rounded-full transition-all ${viewMode === "list" ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white"}`}
            title="List view"
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Desktop-only Tools */}
        <div className="hidden md:flex items-center gap-3">
          {/* Sorting Dropdown */}
          <div className="relative" ref={sortRef}>
            <button
              onClick={() => setSortOpen(!sortOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] text-xs text-white/70 hover:text-white transition-all"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>{currentSortLabel}</span>
              <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${sortOpen ? "rotate-180" : ""}`} />
            </button>
            
            {sortOpen && (
              <div className="absolute right-0 top-full mt-2 w-44 bg-[#0a0814]/95 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-2xl z-50 py-1 overflow-hidden">
                {SORT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleSortChange(option.value)}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                      sortBy === option.value
                        ? "bg-white/10 text-white font-medium"
                        : "text-white/60 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span>{option.label}</span>
                    {sortBy === option.value && (
                      sortOrder === "asc" ? (
                        <ArrowUp className="w-3 h-3 text-cyan-400" />
                      ) : (
                        <ArrowDown className="w-3 h-3 text-cyan-400" />
                      )
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sort order toggle button */}
          <button
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            className="p-1.5 rounded-full bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] text-white/60 hover:text-white transition-all"
            title={sortOrder === "asc" ? "Ascending" : "Descending"}
          >
            {sortOrder === "asc" ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
          </button>

          {/* Create Folder button */}
          <button
            onClick={onNewFolderClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] text-xs text-white/70 hover:text-white transition-all"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span className="font-medium">New Folder</span>
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-full bg-white/[0.02] hover:bg-red-500/20 border border-white/[0.06] hover:border-red-500/30 text-white/50 hover:text-red-400 transition-all"
            title="Logout"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Mobile-only Kebab Menu Dropdown */}
        <div className="relative md:hidden" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1.5 rounded-full bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] text-white/60 hover:text-white transition-all"
            title="More Options"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-[#0a0814]/95 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-2xl z-50 py-1.5 overflow-hidden font-sans">
              {/* New Folder */}
              <div className="border-b border-white/[0.06] pb-1 mb-1">
                <button
                  onClick={() => handleMenuAction(onNewFolderClick)}
                  className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 text-white/70 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <FolderPlus className="w-3.5 h-3.5 text-cyan-400" />
                  <span>New Folder</span>
                </button>
              </div>

              {/* Sorting options */}
              <div className="border-b border-white/[0.06] pb-1.5 mb-1">
                <div className="px-3 py-1 text-[10px] uppercase font-bold tracking-wider text-white/35">Sort by</div>
                {SORT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleMenuAction(() => handleSortChange(option.value))}
                    className={`w-full text-left px-3.5 py-1.5 text-xs flex items-center justify-between transition-colors ${
                      sortBy === option.value
                        ? "bg-white/10 text-white font-medium"
                        : "text-white/60 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span>{option.label}</span>
                    {sortBy === option.value && (
                      sortOrder === "asc" ? (
                        <ArrowUp className="w-3 h-3 text-cyan-400" />
                      ) : (
                        <ArrowDown className="w-3 h-3 text-cyan-400" />
                      )
                    )}
                  </button>
                ))}
              </div>

              {/* Sort Order Toggle */}
              <div className="border-b border-white/[0.06] pb-1 mb-1">
                <button
                  onClick={() => handleMenuAction(() => setSortOrder(sortOrder === "asc" ? "desc" : "asc"))}
                  className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 text-white/70 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Order: {sortOrder === "asc" ? "Ascending" : "Descending"}</span>
                </button>
              </div>

              {/* Logout */}
              <div>
                <button
                  onClick={() => handleMenuAction(handleLogout)}
                  className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
