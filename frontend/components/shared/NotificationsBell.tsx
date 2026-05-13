"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Check, Inbox } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

export function NotificationsBell(): React.ReactNode {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const refresh = async (): Promise<void> => {
    try {
      const { count } = await api.get<{ count: number }>(
        "/notifications/unread-count",
      );
      setUnread(count);
    } catch {
      /* silent — bell is non-critical */
    }
  };

  const loadList = async (): Promise<void> => {
    setLoading(true);
    try {
      const list = await api.get<Notification[]>("/notifications/?limit=10");
      setItems(list);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (open) void loadList();
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const markAllRead = async (): Promise<void> => {
    try {
      await api.post("/notifications/mark-all-read");
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnread(0);
    } catch {
      /* silent */
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl hover:bg-ink-50 transition"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-ink-700" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary-500 text-white text-[10px] font-bold flex items-center justify-center tabular">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto card shadow-lift z-50 animate-slide-down">
          <div className="flex items-center justify-between p-3 border-b border-ink-100 sticky top-0 bg-white z-10">
            <p className="font-semibold text-ink-900 text-sm">Notifications</p>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-[11px] font-semibold text-primary-600 hover:text-primary-700 inline-flex items-center gap-1"
              >
                <Check className="w-3 h-3" /> Mark all read
              </button>
            )}
          </div>

          {loading ? (
            <div className="p-6 text-center text-sm text-ink-400">
              Loading…
            </div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center">
              <Inbox className="w-8 h-8 text-ink-300 mx-auto mb-2" />
              <p className="text-sm text-ink-500">No notifications yet</p>
            </div>
          ) : (
            <ul className="divide-y divide-ink-100">
              {items.map((n) => {
                const inner = (
                  <div
                    className={cn(
                      "p-3 hover:bg-ink-50 transition cursor-pointer",
                      !n.is_read && "bg-primary-50/40",
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {!n.is_read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-ink-900 text-sm">
                          {n.title}
                        </p>
                        {n.body && (
                          <p className="text-xs text-ink-500 mt-0.5 line-clamp-2">
                            {n.body}
                          </p>
                        )}
                        <p className="text-[10px] text-ink-400 mt-1 tabular">
                          {formatDistanceToNow(new Date(n.created_at), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
                return (
                  <li key={n.id}>
                    {n.action_url ? (
                      <Link href={n.action_url} onClick={() => setOpen(false)}>
                        {inner}
                      </Link>
                    ) : (
                      inner
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
