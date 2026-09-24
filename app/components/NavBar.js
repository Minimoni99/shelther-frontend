"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getUser, logout } from "@/lib/api";

const TABS = [
  { href: "/", label: "Find a Home" },
  { href: "/shortlet", label: "Short-let" },
  { href: "/roommate", label: "Find roommate" },
];

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    setUser(getUser());
    const saved = localStorage.getItem("shelther_theme");
    if (saved) {
      setTheme(saved);
      document.documentElement.dataset.theme = saved;
    }
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    localStorage.setItem("shelther_theme", next);
  }

  const onTabPage = TABS.some((t) => t.href === pathname);

  return (
    <nav className="topnav">
      <Link href="/" className="logo">Shelter</Link>

      {onTabPage && (
        <div className="tabs">
          {TABS.map((t) => (
            <Link key={t.href} href={t.href} className={`tab ${pathname === t.href ? "active" : ""}`}>
              {t.label}
            </Link>
          ))}
        </div>
      )}

      <div className="nav-actions">
        <button className="btn btn-ghost btn-sm" onClick={toggleTheme} aria-label="Toggle theme">
          <svg className="icon-sm"><use href={theme === "dark" ? "#icon-sun" : "#icon-moon"} /></svg>
        </button>
        {user ? (
          <Link href="/account" className="btn btn-outline btn-sm">
            <svg className="icon-sm"><use href="#icon-user" /></svg>{user.name || "My Account"}
          </Link>
        ) : (
          <Link href="/login" className="btn btn-ghost btn-sm">Sign in</Link>
        )}
        <Link href="/list-a-property" className="btn btn-outline btn-sm">List a property</Link>
      </div>
    </nav>
  );
}
