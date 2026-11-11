
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";

type Role = "customer" | "organizer" | "super_admin";

type SidebarUser = {
  name: string;
  role: Role;
  profile_photo?: string | null;
};

type MenuItem = {
  label: string;
  href: string;
  icon: string;
  activeIcon: string;
};

type MenuGroup = {
  title: string;
  items: MenuItem[];
};

type SidebarProps = {
  fallbackRole?: Role;
};

const API_ORIGIN = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
).replace(/\/api\/?$/, "");

const icon = (name: string) => `/icons/${name}.png`;
const activeIcon = (name: string) => `/icons/${name}%20(1).png`;

const menus: Record<Role, MenuGroup[]> = {
  customer: [
    {
      title: "Main Menu",
      items: [
        {
          label: "Home",
          href: "/dashboard/customer",
          icon: icon("home"),
          activeIcon: activeIcon("home"),
        },
        {
          label: "Explore Concerts",
          href: "/dashboard/customer/explore",
          icon: icon("cari"),
          activeIcon: activeIcon("cari"),
        },
      ],
    },
    {
      title: "My Activity",
      items: [
        {
          label: "Wishlist",
          href: "/dashboard/customer/wishlist",
          icon: icon("wishlist"),
          activeIcon: activeIcon("wishlist"),
        },
        {
          label: "My Tickets",
          href: "/dashboard/customer/tickets",
          icon: icon("ticket"),
          activeIcon: activeIcon("ticket"),
        },
        {
          label: "My Orders",
          href: "/dashboard/customer/orders",
          icon: icon("clipboard"),
          activeIcon: activeIcon("clipboard"),
        },
        {
          label: "Notifications",
          href: "/dashboard/customer/notifications",
          icon: icon("notif"),
          activeIcon: activeIcon("notif"),
        },
      ],
    },
    {
      title: "Account",
      items: [
        {
          label: "Profile",
          href: "/dashboard/customer/profile",
          icon: icon("user"),
          activeIcon: activeIcon("user"),
        },
        {
          label: "Settings",
          href: "/dashboard/customer/settings",
          icon: icon("setting"),
          activeIcon: activeIcon("setting"),
        },
      ],
    },
  ],

  organizer: [
    {
      title: "Main Menu",
      items: [
        {
          label: "Dashboard",
          href: "/dashboard/organizer",
          icon: icon("home"),
          activeIcon: activeIcon("home"),
        },
        {
          label: "My Events",
          href: "/dashboard/organizer/events",
          icon: icon("ticket"),
          activeIcon: activeIcon("ticket"),
        },
        {
          label: "Create Event",
          href: "/dashboard/organizer/events/create",
          icon: icon("clipboard"),
          activeIcon: activeIcon("clipboard"),
        },
      ],
    },
    {
      title: "Management",
      items: [
        {
          label: "Ticket Management",
          href: "/dashboard/organizer/tickets",
          icon: icon("ticket"),
          activeIcon: activeIcon("ticket"),
        },
        {
          label: "Orders & Sales",
          href: "/dashboard/organizer/orders",
          icon: icon("clipboard"),
          activeIcon: activeIcon("clipboard"),
        },
        {
          label: "Analytics",
          href: "/dashboard/organizer/analytics",
          icon: icon("cari"),
          activeIcon: activeIcon("cari"),
        },
        {
          label: "Notifications",
          href: "/dashboard/organizer/notifications",
          icon: icon("notif"),
          activeIcon: activeIcon("notif"),
        },
      ],
    },
    {
      title: "Account",
      items: [
        {
          label: "Profile",
          href: "/dashboard/organizer/profile",
          icon: icon("user"),
          activeIcon: activeIcon("user"),
        },
        {
          label: "Settings",
          href: "/dashboard/organizer/settings",
          icon: icon("setting"),
          activeIcon: activeIcon("setting"),
        },
      ],
    },
  ],

  super_admin: [
    {
      title: "Main Menu",
      items: [
        {
          label: "Dashboard",
          href: "/dashboard/admin",
          icon: icon("home"),
          activeIcon: activeIcon("home"),
        },
      ],
    },
    {
      title: "Management",
      items: [
        {
          label: "User Management",
          href: "/dashboard/admin/users",
          icon: icon("user"),
          activeIcon: activeIcon("user"),
        },
        {
          label: "Event Management",
          href: "/dashboard/admin/events",
          icon: icon("ticket"),
          activeIcon: activeIcon("ticket"),
        },
        {
          label: "Category Management",
          href: "/dashboard/admin/categories",
          icon: icon("clipboard"),
          activeIcon: activeIcon("clipboard"),
        },
        {
          label: "Organizer Management",
          href: "/dashboard/admin/organizers",
          icon: icon("wishlist"),
          activeIcon: activeIcon("wishlist"),
        },
        {
          label: "Transaction Management",
          href: "/dashboard/admin/transactions",
          icon: icon("ticket"),
          activeIcon: activeIcon("ticket"),
        },
        {
          label: "Reports",
          href: "/dashboard/admin/reports",
          icon: icon("cari"),
          activeIcon: activeIcon("cari"),
        },
        {
          label: "Notifications",
          href: "/dashboard/admin/notifications",
          icon: icon("notif"),
          activeIcon: activeIcon("notif"),
        },
      ],
    },
    {
      title: "Account",
      items: [
        {
          label: "Profile",
          href: "/dashboard/admin/profile",
          icon: icon("user"),
          activeIcon: activeIcon("user"),
        },
        {
          label: "Settings",
          href: "/dashboard/admin/settings",
          icon: icon("setting"),
          activeIcon: activeIcon("setting"),
        },
      ],
    },
  ],
};

const roleLabels: Record<Role, string> = {
  customer: "User",
  organizer: "Event Organizer",
  super_admin: "Super Admin",
};

const dashboardHome: Record<Role, string> = {
  customer: "/dashboard/customer",
  organizer: "/dashboard/organizer",
  super_admin: "/dashboard/admin",
};

export default function Sidebar({
  fallbackRole = "customer",
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<SidebarUser | null>(null);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");

      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);

        if (
          ["customer", "organizer", "super_admin"].includes(
            parsedUser.role
          )
        ) {
          setUser(parsedUser);
        }
      }
    } catch {
      localStorage.removeItem("user");
    }
  }, []);

  const role = user?.role || fallbackRole;
  const menuGroups = menus[role];

  function isActive(href: string) {
    if (pathname === href) return true;

    return (
      href !== dashboardHome[role] &&
      pathname.startsWith(`${href}/`)
    );
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.replace("/login");
  }

  const profilePhoto = user?.profile_photo
    ? user.profile_photo.startsWith("http")
      ? user.profile_photo
      : `${API_ORIGIN}${
          user.profile_photo.startsWith("/") ? "" : "/"
        }${user.profile_photo}`
    : "/icons/user.png";

  return (
    <>
      <aside className="lynora-sidebar">
        {/* HEADER */}
        <div className="lynora-sidebar-header">
          <Link
            href={dashboardHome[role]}
            className="lynora-logo"
          >
            LYNORA
          </Link>

          <button
            type="button"
            className="lynora-grid-button"
            aria-label="Menu"
          >
            <Image
              src="/icons/grid.png"
              alt=""
              width={23}
              height={23}
            />
          </button>
        </div>

        {/* NAVIGATION */}
        <nav className="lynora-sidebar-nav">
          {menuGroups.map((group) => (
            <div
              className="lynora-menu-group"
              key={group.title}
            >
              <h3 className="lynora-menu-title">
                {group.title}
              </h3>

              <div className="lynora-menu-list">
                {group.items.map((item) => {
                  const selected = isActive(item.href);

                  return (
                    <Link
                      href={item.href}
                      key={item.href}
                      className={`lynora-menu-item ${
                        selected ? "active" : ""
                      }`}
                      aria-current={
                        selected ? "page" : undefined
                      }
                    >
                      <img
                        src={
                          selected
                            ? item.activeIcon
                            : item.icon
                        }
                        alt=""
                        className="lynora-menu-icon"
                      />

                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* FOOTER */}
        <div className="lynora-sidebar-footer">
          <div className="lynora-sidebar-user">
            <img
              src={profilePhoto}
              alt="Profile"
              className="lynora-user-avatar"
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = "/icons/user.png";
              }}
            />

            <div className="lynora-user-info">
              <strong>
                {user?.name || "LYNORA User"}
              </strong>
              <span>{roleLabels[role]}</span>
            </div>
          </div>

          <div className="lynora-footer-divider" />

          <div className="lynora-footer-brand">
            LYNORA
          </div>

          <button
            type="button"
            className="lynora-logout-button"
            onClick={handleLogout}
            aria-label="Log Out"
            title="Log Out"
          >
            <img
              src="/icons/upload.png"
              alt=""
              className="lynora-upload-icon"
            />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      <style jsx global>{`
        .lynora-sidebar {
          position: fixed;
          inset: 0 auto 0 0;
          z-index: 30;
          width: 205px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          color: #f8f9ff;
          background: #0b1021;
          border-right: 1px solid #302d64;
        }

        /* HEADER */
        .lynora-sidebar-header {
          height: 70px;
          flex: 0 0 70px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 12px;
          border-bottom: 1px solid #202640;
        }

        .lynora-logo {
          font-size: 25px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: -1px;
          text-decoration: none;
          background: linear-gradient(
            90deg,
            #8b6cff,
            #36c5f5
          );
          color: transparent;
          background-clip: text;
        }

        .lynora-grid-button {
          width: 35px;
          height: 35px;
          display: grid;
          place-items: center;
          padding: 0;
          background: transparent;
          border: none;
          outline: none;
          box-shadow: none;
          cursor: pointer;
        }

        .lynora-grid-button img {
          width: 23px;
          height: 23px;
          object-fit: contain;
        }

        /* NAVIGATION */
        .lynora-sidebar-nav {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 17px 12px;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .lynora-sidebar-nav::-webkit-scrollbar {
          display: none;
          width: 0;
        }

        .lynora-menu-group {
          margin-bottom: 19px;
        }

        .lynora-menu-title {
          margin: 10px 0 13px;
          color: #727b96;
          font-size: 12px;
          font-weight: 700;
          text-transform: capitalize;
        }

        .lynora-menu-list {
          display: grid;
          gap: 5px;
        }

        .lynora-menu-item {
          min-height: 43px;
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 0 12px;
          border-radius: 8px;
          color: #858da5;
          font-size: 14px;
          text-decoration: none;
          transition:
            background 0.18s ease,
            color 0.18s ease;
        }

        .lynora-menu-item:hover {
          color: #fff;
          background: #191e3a;
        }

        .lynora-menu-item.active {
          color: #fff;
          font-weight: 700;
          background: linear-gradient(
            90deg,
            #22d3ee 0%,
            #332d87 3%,
            #332d87 100%
          );
          box-shadow: 0 4px 10px
            rgba(34, 211, 238, 0.16);
        }

        .lynora-menu-icon {
          width: 23px;
          height: 23px;
          flex: 0 0 23px;
          object-fit: contain;
        }

        /* FOOTER */
        .lynora-sidebar-footer {
          flex: 0 0 auto;
          padding: 10px 12px 8px;
          background: #0b1021;
          border-top: 1px solid #30364d;
        }

        .lynora-sidebar-user {
          display: flex;
          align-items: center;
          gap: 9px;
          min-width: 0;
          padding: 3px 0 9px;
        }

        .lynora-user-avatar {
          width: 40px;
          height: 40px;
          flex: 0 0 40px;
          border: none;
          outline: none;
          border-radius: 50%;
          object-fit: cover;
          background: transparent;
        }

        .lynora-user-info {
          flex: 1;
          min-width: 0;
        }

        .lynora-user-info strong {
          display: block;
          overflow: hidden;
          color: #f8f9ff;
          font-size: 12px;
          font-weight: 700;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .lynora-user-info span {
          display: block;
          margin-top: 3px;
          color: #ff174f;
          font-size: 11px;
        }

        .lynora-footer-divider {
          height: 1px;
          width: calc(100% + 24px);
          margin-left: -12px;
          background: #41445b;
        }

        .lynora-footer-brand {
          padding: 7px 0 2px;
          text-align: center;
          font-size: 22px;
          line-height: 1.2;
          font-weight: 500;
          letter-spacing: 4px;
          background: linear-gradient(
            90deg,
            #8b6cff,
            #36c5f5
          );
          color: transparent;
          background-clip: text;
        }

        .lynora-logout-button {
          width: 100%;
          min-height: 29px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 2px;
          padding: 3px;
          color: #ff8299;
          background: transparent;
          border: none;
          cursor: pointer;
          font-size: 11px;
        }

        .lynora-upload-icon {
          width: 18px;
          height: 18px;
          object-fit: contain;
        }

        .lynora-logout-button:hover {
          color: #fff;
        }

        /* MOBILE */
        @media (max-width: 760px) {
          .lynora-sidebar {
            width: 65px;
          }

          .lynora-sidebar-header {
            justify-content: center;
            padding: 0 4px;
          }

          .lynora-logo {
            font-size: 0;
          }

          .lynora-logo::first-letter {
            font-size: 24px;
          }

          .lynora-grid-button,
          .lynora-menu-title,
          .lynora-menu-item span,
          .lynora-user-info,
          .lynora-footer-divider,
          .lynora-footer-brand,
          .lynora-logout-button span {
            display: none;
          }

          .lynora-sidebar-nav {
            padding: 14px 7px;
          }

          .lynora-menu-item {
            justify-content: center;
            padding: 0;
          }

          .lynora-menu-icon {
            width: 24px;
            height: 24px;
          }

          .lynora-sidebar-footer {
            padding: 9px 7px;
          }

          .lynora-sidebar-user {
            justify-content: center;
            padding: 2px 0 10px;
          }

          .lynora-user-avatar {
            width: 37px;
            height: 37px;
          }

          .lynora-logout-button {
            justify-content: center;
            padding: 5px 0;
          }
        }
      `}</style>
    </>
  );
}
