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
      <h1 className="text-2xl font-bold text-white mb-2">Access List</h1>
      <p className="text-gray-500 text-sm mb-6">Manage who can sign in to Jopler</p>

      <div className="flex gap-2 mb-6">
        <input
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addEmail()}
          placeholder="email@example.com"
          className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:border-amber-500 focus:outline-none"
        />
        <button
          onClick={addEmail}
          className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium text-sm transition"
        >
          Add
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {emails.map((e) => (
          <div
            key={e.id}
            className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-lg px-4 py-3"
          >
            <div>
              <span className="text-sm text-white">{e.email}</span>
              {e.email === session?.user?.email && (
                <span className="ml-2 text-xs text-amber-400">(you)</span>
              )}
              {primaryAdminEmail && e.email === primaryAdminEmail && (
                <span className="ml-2 text-xs text-gray-500">admin</span>
              )}
            </div>
            {(!primaryAdminEmail || e.email !== primaryAdminEmail) && (
              <button
                onClick={() => removeEmail(e.email)}
                className="text-xs text-red-400 hover:text-red-300 transition"
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
