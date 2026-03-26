"use client";

/**
 * ProtectedPageWrapper
 *
 * Validates the user's session on every protected page.  The validation
 * strategy (in priority order):
 *
 *  1. Check the HTTP-only session cookie via /api/check-session using the
 *     device-ID stored in localStorage.  This is the fast-path — zero
 *     extra round-trips when the user is already authenticated.
 *
 *  2. If the device-ID check fails (e.g. different browser / cleared
 *     localStorage / first load after deploy), call /api/auto-login.
 *     That endpoint validates the cookie server-side, issues a new
 *     device-ID, and returns it so we can persist it in localStorage.
 *
 *  3. If both checks fail (no cookie, expired session, account locked)
 *     the wrapper redirects to /Login and clears any stale localStorage
 *     state.
 *
 * No business logic is modified — only the authentication plumbing.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// ─── Constants ────────────────────────────────────────────────────────────────

const LOGIN_PATH = "/Login";
const CHECK_SESSION_PATH = "/api/check-session";
const AUTO_LOGIN_PATH = "/api/auto-login";

const DEVICE_ID_KEY = "deviceId";
const USER_ID_KEY = "userId";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Retrieve or lazily create a stable device-ID stored in localStorage. */
function getOrCreateDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;

    const fresh =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    localStorage.setItem(DEVICE_ID_KEY, fresh);
    return fresh;
  } catch {
    // localStorage unavailable (SSR guard, private-mode quirks)
    return "";
  }
}

/** Purge auth-related localStorage keys on session invalidation. */
function clearAuthStorage(): void {
  try {
    localStorage.removeItem(DEVICE_ID_KEY);
    localStorage.removeItem(USER_ID_KEY);
  } catch {
    // ignore
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ProtectedPageWrapperProps {
  children: React.ReactNode;
}

export default function ProtectedPageWrapper({
  children,
}: ProtectedPageWrapperProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  /**
   * Use a ref to prevent running the effect twice in React Strict Mode
   * (dev only) while keeping the dependency array clean.
   */
  const hasChecked = useRef(false);

  useEffect(() => {
    if (hasChecked.current) return;
    hasChecked.current = true;

    let cancelled = false;

    async function validateSession() {
      // ── Step 1: fast-path — cookie + device-ID ──────────────────────────
      const deviceId = getOrCreateDeviceId();

      try {
        const res = await fetch(CHECK_SESSION_PATH, {
          headers: { "x-device-id": deviceId },
          cache: "no-store",
        });

        if (!cancelled && res.status === 200) {
          setLoading(false);
          return;
        }
      } catch {
        // network error — fall through to auto-login
      }

      if (cancelled) return;

      // ── Step 2: auto-login via cookie (no client-supplied id needed) ─────
      try {
        const autoRes = await fetch(AUTO_LOGIN_PATH, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // body intentionally empty — the cookie is the credential
          body: JSON.stringify({}),
          cache: "no-store",
        });

        if (!cancelled && autoRes.ok) {
          const data = await autoRes.json();

          if (data.success) {
            // Persist the fresh device-ID so future page loads hit step 1
            if (data.deviceId) {
              try {
                localStorage.setItem(DEVICE_ID_KEY, data.deviceId);
              } catch {
                // ignore
              }
            }

            // Persist userId for convenience (sidebar, profile page, etc.)
            if (data.userId) {
              try {
                localStorage.setItem(USER_ID_KEY, data.userId);
              } catch {
                // ignore
              }
            }

            setLoading(false);
            return;
          }
        }
      } catch {
        // network error — fall through to redirect
      }

      if (cancelled) return;

      // ── Step 3: session is invalid — clear storage and redirect ──────────
      clearAuthStorage();
      router.replace(LOGIN_PATH);
    }

    validateSession();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    // Invisible placeholder — keeps layout stable while auth resolves.
    // Replace with a branded skeleton/spinner if desired.
    return (
      <div
        aria-hidden="true"
        className="flex h-screen w-full items-center justify-center"
      />
    );
  }

  return <>{children}</>;
}
