"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ErrorAlert } from "@/components/Alert";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { ControlChip, GlassPanel, StatusBeacon } from "@/components/OpsUI";
import { get, patch } from "@/lib/api";
import { getSocket } from "@/lib/socket";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  actionUrl?: string | null;
  readAt?: string | null;
  isRead?: boolean;
  createdAt: string;
  event?: {
    title?: string;
  } | null;
};

function formatTime(value: string) {
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getTone(type: string): "cyan" | "violet" | "lime" | "amber" | "rose" {
  if (type.includes("CANCELLED") || type.includes("REVOKED")) return "rose";
  if (type.includes("PROMOTED") || type.includes("CONFIRMED") || type.includes("CHECKIN")) return "lime";
  if (type.includes("WAITLIST")) return "amber";
  if (type.includes("CREW")) return "violet";
  return "cyan";
}

export function NotificationsClient() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadNotifications() {
    setError("");
    const payload = await get("/api/notifications");
    setNotifications(Array.isArray(payload?.data?.notifications) ? payload.data.notifications : []);
  }

  useEffect(() => {
    let active = true;

    loadNotifications()
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Notifications unavailable.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    const socket = getSocket();
    if (!socket) {
      return () => {
        active = false;
      };
    }
    const handleCreated = (payload: any) => {
      const notification = payload?.notification;
      if (!notification?.id) return;
      setNotifications((current) => [notification, ...current.filter((item) => item.id !== notification.id)]);
    };
    const handleRead = (payload: any) => {
      if (!payload?.notificationId) {
        setNotifications((current) => current.map((item) => ({ ...item, isRead: true, readAt: item.readAt || new Date().toISOString() })));
        return;
      }

      setNotifications((current) =>
        current.map((item) => item.id === payload.notificationId ? { ...item, isRead: true, readAt: item.readAt || new Date().toISOString() } : item)
      );
    };

    socket.on("notification-created", handleCreated);
    socket.on("notification-read", handleRead);

    return () => {
      active = false;
      socket.off("notification-created", handleCreated);
      socket.off("notification-read", handleRead);
    };
  }, []);

  const unreadCount = notifications.filter((notification) => !notification.isRead).length;
  const filteredNotifications = useMemo(() => {
    if (filter === "unread") return notifications.filter((notification) => !notification.isRead);
    if (filter === "read") return notifications.filter((notification) => notification.isRead);
    return notifications;
  }, [filter, notifications]);

  async function markRead(notificationId: string) {
    const payload = await patch(`/api/notifications/${notificationId}/read`, {});
    const updated = payload?.data?.notification;
    if (!updated?.id) return;

    setNotifications((current) => current.map((item) => item.id === updated.id ? updated : item));
  }

  async function markAllRead() {
    await patch("/api/notifications/read-all", {});
    const now = new Date().toISOString();
    setNotifications((current) => current.map((item) => ({ ...item, isRead: true, readAt: item.readAt || now })));
  }

  return (
    <div className="grid gap-5">
      <GlassPanel className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {["all", "unread", "read"].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.16em] transition ${filter === item ? "border-cyan-300/45 bg-cyan-300/12 text-cyan-100" : "border-white/10 bg-white/5 text-white/55 hover:text-white"}`}
            >
              {item}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={markAllRead}
          disabled={unreadCount === 0}
          className="rounded-full border border-cyan-300/24 bg-cyan-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-cyan-100 transition hover:border-cyan-300/45 disabled:cursor-not-allowed disabled:opacity-45"
        >
          Mark all read
        </button>
      </GlassPanel>

      {error ? <ErrorAlert title="Notification warning">{error}</ErrorAlert> : null}

      {isLoading ? (
        <GlassPanel>
          <LoadingState label="Loading notifications" />
        </GlassPanel>
      ) : null}

      {!isLoading && filteredNotifications.length === 0 ? (
        <EmptyState title="No notifications">Your EventFlow AI updates will appear here.</EmptyState>
      ) : null}

      <div className="grid gap-3">
        {filteredNotifications.map((notification) => (
          <GlassPanel key={notification.id} className={`p-4 ${notification.isRead ? "opacity-70" : "border-cyan-300/28"}`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <StatusBeacon status={notification.isRead ? "closed" : "live"} label={notification.isRead ? "read" : "new"} />
                  <ControlChip tone={getTone(notification.type)}>{notification.type.replaceAll("_", " ")}</ControlChip>
                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/38">{formatTime(notification.createdAt)}</span>
                </div>
                <h2 className="text-xl font-black text-white">{notification.title}</h2>
                <p className="mt-2 text-sm leading-6 text-white/62">{notification.message}</p>
                {notification.event?.title ? <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-cyan-100/50">{notification.event.title}</p> : null}
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {notification.actionUrl ? (
                  <Link href={notification.actionUrl} className="rounded-full border border-cyan-300/24 bg-cyan-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-cyan-100 transition hover:border-cyan-300/45">
                    Open
                  </Link>
                ) : null}
                {!notification.isRead ? (
                  <button
                    type="button"
                    onClick={() => markRead(notification.id)}
                    className="rounded-full border border-white/12 bg-white/6 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white/75 transition hover:bg-white/10 hover:text-white"
                  >
                    Mark read
                  </button>
                ) : null}
              </div>
            </div>
          </GlassPanel>
        ))}
      </div>
    </div>
  );
}
