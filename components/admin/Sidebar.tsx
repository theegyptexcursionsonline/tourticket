"use client";

import React, { useState, useEffect } from "react";
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
  TrendingUp,
  PenSquare,
  Sparkles,
  X,
  Layout, // For Attraction Pages icon (kept for future if needed)
} from "lucide-react";

// ✅ Reordered navItems based on requested order
const navItems = [
  { href: "/admin/bookings", label: "Bookings", icon: FileText },
  { href: "/admin/manifests", label: "Manifest", icon: ListPlus },
  { href: "/admin/discounts", label: "Discounts", icon: Percent },
  { href: "/admin/reviews", label: "Reviews", icon: MessageSquare },
  { href: "/admin/reports", label: "Reports", icon: TrendingUp },
  { href: "/admin/tours", label: "Tours", icon: Compass },
  { href: "/admin/destinations", label: "Destination", icon: Map },
  { href: "/admin/categories", label: "Category", icon: Tag },
  { href: "/admin/blog", label: "Blog", icon: PenSquare },
  { href: "/admin/users", label: "User", icon: Users },
];

const AdminSidebar = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();
  const showLabel = isOpen || isMobile;

  // Handle mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth < 1024) {
        setIsOpen(false);
      } else {
        setIsMobileOpen(false);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Prevent scroll when mobile menu is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobileOpen]);

  const toggleSidebar = () => {
    if (isMobile) {
      setIsMobileOpen(!isMobileOpen);
    } else {
      setIsOpen(!isOpen);
    }
  };

  const sidebarWidth = isOpen ? "w-72" : "w-20";
  const mobileClass = isMobile
    ? `fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out ${
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      }`
    : "";

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile Toggle Button */}
      {isMobile && (
        <button
          onClick={toggleSidebar}
          className="fixed top-4 left-4 z-50 flex items-center justify-center h-12 w-12 rounded-xl bg-white shadow-lg border border-slate-200 text-slate-600 hover:text-slate-900 transition-all duration-200 lg:hidden"
        >
          {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      )}

      {/* Sidebar */}
      <aside
        className={`h-screen bg-white border-r border-slate-200/60 backdrop-blur-sm flex flex-col transition-all duration-300 ease-out shadow-lg overflow-hidden ${sidebarWidth} ${mobileClass} ${
          isMobile ? "w-72" : ""
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-6 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {/* Logo with gradient background */}
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl opacity-10"></div>
              <div className="relative bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-xl">
                <Image
                  src="/EEO-logo.png"
                  alt="Logo"
                  width={24}
                  height={24}
                  className="rounded-sm filter brightness-0 invert"
                />
              </div>
            </div>

            {/* Title with gradient */}
            <div
              className={`transition-all duration-300 min-w-0 ${
                !isOpen && !isMobile && "opacity-0 translate-x-2 overflow-hidden"
              }`}
            >
              <h1 className="text-lg font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent truncate">
                AdminPanel
              </h1>
              <p className="text-xs text-slate-500 -mt-0.5 truncate">
                Egypt Excursions
              </p>
            </div>
          </div>

          {/* Toggle button - Hidden on mobile */}
          {!isMobile && (
            <button
              onClick={toggleSidebar}
              className="flex items-center justify-center h-10 w-10 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all duration-200 hover:scale-105 active:scale-95 border border-slate-200/50 flex-shrink-0"
            >
              {isOpen ? (
                <ChevronLeft className="h-4 w-4 text-slate-600" />
              ) : (
                <Menu className="h-4 w-4 text-slate-600" />
              )}
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-6 px-4 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
          <ul className="space-y-2">
            {navItems.map(({ href, label, icon: Icon }, index) => {
              const active =
                pathname.startsWith(href) &&
                (href !== "/admin" || pathname === "/admin");

              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={`relative group flex items-center rounded-2xl transition-all duration-200 overflow-hidden ${
                      showLabel
                        ? "gap-4 px-4 py-3.5"
                        : "justify-center p-3.5 mx-auto w-14"
                    } ${
                      active
                        ? "bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 shadow-sm border border-blue-100/50"
                        : "hover:bg-slate-50 text-slate-700 hover:text-slate-900"
                    } ${!showLabel ? "hover:scale-105" : "hover:translate-x-1"}`}
                    style={{
                      animationDelay: `${index * 50}ms`,
                    }}
                  >
                    {/* Active indicator */}
                    {active && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                    )}

                    {/* Icon with background */}
                    <div
                      className={`p-2 rounded-xl transition-all duration-200 flex-shrink-0 ${
                        active
                          ? "bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25"
                          : "bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-600"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>

                    {/* Label */}
                    {showLabel && (
                      <span
                        className={`font-medium transition-all duration-300 truncate min-w-0 ${
                          active
                            ? "text-slate-800"
                            : "text-slate-600 group-hover:text-slate-800"
                        }`}
                      >
                        {label}
                      </span>
                    )}

                    {/* Active glow effect */}
                    {active && (
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-2xl"></div>
                    )}

                    {/* Tooltip when collapsed */}
                    {!showLabel && (
                      <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-slate-900 text-white text-sm px-3 py-2 rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none shadow-2xl transition-all duration-200 z-50 whitespace-nowrap">
                        {label}
                        <div className="absolute right-full top-1/2 -translate-y-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
                      </div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Decorative element */}
          {showLabel && (
            <div className="mt-8 mx-4 p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border border-slate-200/50">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex-shrink-0">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-slate-800 truncate">
                    Pro Tip
                  </h3>
                  <p className="text-xs text-slate-500 truncate">
                    Use keyboard shortcuts
                  </p>
                </div>
              </div>
              <div className="text-xs text-slate-600 leading-relaxed">
                Press{" "}
                <kbd className="px-2 py-1 bg-white rounded border text-slate-800 font-mono">
                  Ctrl + /
                </kbd>{" "}
                to toggle sidebar
              </div>
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex-shrink-0">
          {showLabel ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">EEO</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-700 truncate">
                  Egypt Excursions Online
                </p>
                <p className="text-xs text-slate-500 truncate">
                  © 2025 All rights reserved
                </p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">EEO</span>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;
