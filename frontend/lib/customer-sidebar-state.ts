
"use client";

const STORAGE_KEY = "lynora:customer-sidebar-collapsed";

let collapsed = false;
let initialized = false;
const listeners = new Set<(value: boolean) => void>();

export function getCustomerSidebarCollapsed() {
  return collapsed;
}

export function initializeCustomerSidebarPreference() {
  if (typeof window !== "undefined" && !initialized) {
    collapsed = window.localStorage.getItem(STORAGE_KEY) === "true";
    initialized = true;
  }

  return collapsed;
}

export function setCustomerSidebarCollapsed(value: boolean) {
  collapsed = value;
  initialized = true;

  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, String(value));
  }

  listeners.forEach((listener) => listener(collapsed));
}

export function subscribeCustomerSidebar(
  listener: (value: boolean) => void
) {
  listeners.add(listener);

  return () => listeners.delete(listener);
}
