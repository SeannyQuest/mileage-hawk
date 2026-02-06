"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Plane, ArrowRight, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { REGION_LABELS } from "@/lib/constants";

interface QuickSearchRoute {
  id: string;
  slug: string;
  origin: string;
  originCity: string;
  destination: string;
  destinationCity: string;
  region: string;
}

interface QuickSearchProps {
  routes: QuickSearchRoute[];
}

export function QuickSearch({ routes }: QuickSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return routes
      .filter(
        (r) =>
          r.origin.toLowerCase().includes(q) ||
          r.destination.toLowerCase().includes(q) ||
          r.originCity.toLowerCase().includes(q) ||
          r.destinationCity.toLowerCase().includes(q) ||
          `${r.origin} ${r.destination}`.toLowerCase().includes(q) ||
          `${r.originCity} to ${r.destinationCity}`.toLowerCase().includes(q)
      )
      .slice(0, 8); // Limit to 8 results
  }, [routes, query]);

  // Reset highlighted index when results change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filtered.length]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        inputRef.current &&
        !inputRef.current.contains(e.target as Node) &&
        listRef.current &&
        !listRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (route: QuickSearchRoute) => {
    setQuery("");
    setIsOpen(false);
    router.push(`/routes/${route.slug}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || filtered.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        handleSelect(filtered[highlightedIndex]);
        break;
      case "Escape":
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder="Search routes — try &quot;London&quot; or &quot;NRT&quot;..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (query.trim()) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className="pl-9 pr-9 h-11"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && query.trim() && (
        <div
          ref={listRef}
          className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg z-50 overflow-hidden"
        >
          {filtered.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              No routes found for &quot;{query}&quot;
            </div>
          ) : (
            <div className="py-1">
              {filtered.map((route, idx) => (
                <button
                  key={route.id}
                  onClick={() => handleSelect(route)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`w-full text-left px-4 py-2.5 flex items-center justify-between transition-colors ${
                    idx === highlightedIndex ? "bg-accent" : "hover:bg-accent/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Plane className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-medium">{route.origin}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium">{route.destination}</span>
                    <span className="text-sm text-muted-foreground truncate">
                      {route.originCity} to {route.destinationCity}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0 ml-2">
                    {REGION_LABELS[route.region] ?? route.region}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
