"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface EmailEntry {
  id: string;
  email: string;
  addedAt: string | null;
}

export default function AccessPage() {
  const { data: session } = useSession();
  const [emails, setEmails] = useState<EmailEntry[]>([]);
  const [primaryAdminEmail, setPrimaryAdminEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [error, setError] = useState("");
  const [isSuperadmin, setIsSuperadmin] = useState(false);

  useEffect(() => {
    fetch("/api/training/is-admin")
      .then((r) => r.json())
      .then((d) => setIsSuperadmin(d.isSuperadmin === true))
      .catch(() => {});
  }, []);

  async function fetchEmails() {
    const res = await fetch("/api/access");
    const data = await res.json();
    if (data.emails) {
      setEmails(data.emails);
      setPrimaryAdminEmail(data.primaryAdminEmail ?? "");
    } else if (Array.isArray(data)) {
      setEmails(data);
    }
  }

  useEffect(() => { fetchEmails(); }, []);

  async function addEmail() {
    setError("");
    if (!newEmail.includes("@")) { setError("Invalid email"); return; }
    const res = await fetch("/api/access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newEmail }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to add");
      return;
    }
    setNewEmail("");
    fetchEmails();
  }

  async function removeEmail(email: string) {
    const res = await fetch("/api/access", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to remove");
      return;
    }
    fetchEmails();
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--color-text)" }}>Access</h1>
      <p className="text-gray-500 text-sm mb-6">Manage who can sign in to Jopler</p>

      {isSuperadmin && (
      <div className="flex gap-2 mb-6 items-stretch">
        <input
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addEmail()}
          placeholder="email@example.com"
          className="flex-1 min-w-0 h-10 bg-gray-900 border border-gray-700 rounded-lg px-4 text-sm placeholder-gray-600 focus:border-amber-500 focus:outline-none"
          style={{ color: "var(--color-text)" }}
        />
        <button
          onClick={addEmail}
          className="h-10 px-5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium text-sm transition shrink-0"
        >
          Add
        </button>
      </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {emails.map((e) => (
          <div
            key={e.id}
            className="flex items-center justify-between gap-3 bg-gray-800/60 border border-gray-700 rounded-lg px-4 py-2.5 min-h-0"
          >
            <div className="min-w-0 flex items-center gap-2">
              <span className="text-sm truncate" style={{ color: "var(--color-text)" }}>{e.email}</span>
              {e.email === session?.user?.email && (
                <span className="text-xs text-amber-400 shrink-0">(you)</span>
              )}
              {primaryAdminEmail && e.email === primaryAdminEmail && (
                <span className="text-xs text-gray-500 shrink-0">admin</span>
              )}
            </div>
            {isSuperadmin && (!primaryAdminEmail || e.email !== primaryAdminEmail) && (
              <button
                onClick={() => removeEmail(e.email)}
                className="text-xs text-red-400 hover:text-red-300 transition shrink-0"
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
