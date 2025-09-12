// components/admin/Sidebar.tsx
"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Map,
  Compass,
  Tag,
  Menu,
  ChevronLeft,
  FileText,
  ListPlus,
  Percent,
  MessageSquare,
  Users,
  TrendingUp, // Import the TrendingUp icon for reports
} from "lucide-react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/tours", label: "Tours", icon: Compass },
  { href: "/admin/bookings", label: "Bookings", icon: FileText },
  { href: "/admin/manifests", label: "Manifests", icon: ListPlus },
  { href: "/admin/discounts", label: "Discounts", icon: Percent },
  { href: "/admin/reviews", label: "Reviews", icon: MessageSquare },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/reports", label: "Reports", icon: TrendingUp }, // Added Reports link
  { href: "/admin/destinations", label: "Destinations", icon: Map },
  { href: "/admin/categories", label: "Categories", icon: Tag },
];

const AdminSidebar = () => {
  const [isOpen, setIsOpen] = useState(true);
  const pathname = usePathname();

  const toggleSidebar = () => setIsOpen((prev) => !prev);

  return (
    <aside
      className={`h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-slate-200 flex flex-col transition-all duration-300 ${
        isOpen ? "w-64" : "w-20"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <Image
            src="/EEO-logo.png"
            alt="Logo"
            width={32}
            height={32}
            className="rounded-md"
          />

          {/* Title */}
          <span
            className={`text-sm font-semibold tracking-wide text-white transition-opacity duration-200 ${
              !isOpen && "opacity-0"
            }`}
          >
            AdminPanel
          </span>
        </div>

        {/* Toggle button */}
        <button
          onClick={toggleSidebar}
          className="flex items-center justify-center h-8 w-8 rounded-md hover:bg-slate-700 transition"
        >
          {isOpen ? (
            <ChevronLeft className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`relative group flex items-center gap-3 px-4 py-2.5 rounded-md transition-colors ${
                    active
                      ? "bg-slate-800 text-white border-l-4 border-sky-500"
                      : "hover:bg-slate-700"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 shrink-0 ${
                      active
                        ? "text-sky-400"
                        : "text-slate-400 group-hover:text-slate-200"
                    }`}
                  />
                  <span
                    className={`text-sm font-medium transition-opacity duration-200 ${
                      !isOpen && "opacity-0"
                    }`}
                  >
                    {label}
                  </span>

                  {/* Tooltip when collapsed */}
                  {!isOpen && (
                    <span className="absolute left-20 bg-slate-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none shadow-lg">
                      {label}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-700 text-xs text-slate-400">
        {isOpen ? "© 2025 Egypt Excursions Online" : "©"}
      </div>
    </aside>
  );
};

export default AdminSidebar;