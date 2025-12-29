"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function DecisionSetupPage() {
  const router = useRouter();
  const [policy, setPolicy] = useState<"conservative" | "balanced" | "aggressive">("balanced");
  const [demandChange, setDemandChange] = useState<number>(0);

  const handleRunSimulation = () => {
    router.push(`/decision-flow/history?policy=${policy}&demandChange=${demandChange}`);
  };

  return (
    <main style={{
      background: "#0e1117",
      color: "#e6edf3",
      minHeight: "100vh",
      padding: 32
    }}>
      <div style={{ marginBottom: 24 }}>
        <Link
          href="/decision-flow"
          style={{
            color: "#9ca3af",
            textDecoration: "none",
            fontSize: 14
          }}
        >
          ← Tillbaka till beslutsflöde
        </Link>
      </div>

      <h1 style={{ marginBottom: 8 }}>Beslutsinställning</h1>
      <p style={{ fontSize: 15, opacity: 0.9, marginBottom: 40 }}>
        Beskriv beslutet. Pulse visar konsekvenserna över tid.
      </p>

      {/* Policy Section */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 16, marginBottom: 16 }}>Välj strategi</h2>
        <div style={{
          padding: 20,
          background: "#1a1f2e",
          border: "1px solid #2f333a",
          borderRadius: 8
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input
                type="radio"
                name="policy"
                value="conservative"
                checked={policy === "conservative"}
                onChange={(e) => setPolicy(e.target.value as "conservative" | "balanced" | "aggressive")}
                style={{ cursor: "pointer" }}
              />
              <span style={{ fontSize: 14 }}>Försiktig</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input
                type="radio"
                name="policy"
                value="balanced"
                checked={policy === "balanced"}
                onChange={(e) => setPolicy(e.target.value as "conservative" | "balanced" | "aggressive")}
                style={{ cursor: "pointer" }}
              />
              <span style={{ fontSize: 14 }}>Balanserad</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input
                type="radio"
                name="policy"
                value="aggressive"
                checked={policy === "aggressive"}
                onChange={(e) => setPolicy(e.target.value as "conservative" | "balanced" | "aggressive")}
                style={{ cursor: "pointer" }}
              />
              <span style={{ fontSize: 14 }}>Aggressiv</span>
            </label>
          </div>
        </div>
      </section>

      {/* Assumptions Section */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 16, marginBottom: 16 }}>Antaganden</h2>
        <div style={{
          padding: 20,
          background: "#1a1f2e",
          border: "1px solid #2f333a",
          borderRadius: 8
        }}>
          <label style={{ display: "block", marginBottom: 8, fontSize: 14 }}>
            Efterfrågeförändring
          </label>
          <select
            value={demandChange}
            onChange={(e) => setDemandChange(Number(e.target.value))}
            style={{
              padding: "8px 12px",
              fontSize: 14,
              background: "#0e1117",
              color: "#e6edf3",
              border: "1px solid #2f333a",
              borderRadius: 4,
              cursor: "pointer",
              minWidth: 120
            }}
          >
            <option value={-10}>−10 %</option>
            <option value={0}>0 %</option>
            <option value={10}>+10 %</option>
            <option value={20}>+20 %</option>
          </select>
        </div>
      </section>

      {/* Run Button */}
      <div style={{ marginTop: 32 }}>
        <button
          onClick={handleRunSimulation}
          style={{
            padding: "12px 24px",
            fontSize: 14,
            fontWeight: 600,
            background: "#2563eb",
            color: "#ffffff",
            border: "none",
            borderRadius: 4,
            cursor: "pointer"
          }}
        >
          Kör simulering
        </button>
      </div>
    </main>
  );
}

