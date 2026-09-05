"use client";

// Printable single-page summary: itinerary, travellers and their flights.
import { useQuery } from "convex/react";
import { Button, Loader } from "@vibe/core";
import { api } from "@/convex/_generated/api";
import { vibeColorVar } from "@/lib/colors";
import { longDate, shortDate } from "@/lib/dates";

export default function PrintPage() {
  const destinations = useQuery(api.trip.listDestinations);
  const travellers = useQuery(api.trip.listTravellers);
  const segments = useQuery(api.trip.listTravelSegments);
  const vibes = useQuery(api.trip.listVibes);

  if (!destinations || !travellers || !segments || !vibes) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader size="medium" />
      </div>
    );
  }

  const places = destinations.filter((d) => d.kind !== "buffer");

  return (
    <div className="max-w-3xl mx-auto p-8 flex flex-col gap-6 bg-white min-h-screen">
      <div className="flex items-center justify-between print:hidden">
        <Button size="small" onClick={() => window.print()}>
          Print
        </Button>
      </div>

      <div>
        <h1 style={{ font: "var(--font-h1)", margin: 0 }}>Thailand 2027</h1>
        <p style={{ font: "var(--font-text1-normal)", color: "var(--secondary-text-color)", margin: 0 }}>
          Friday 9 April – Sunday 2 May 2027 · {travellers.length} travellers
        </p>
      </div>

      <section>
        <h2 style={{ font: "var(--font-h3-medium)" }}>Itinerary</h2>
        <table className="w-full" style={{ borderCollapse: "collapse", font: "var(--font-text2-normal)" }}>
          <tbody>
            {places.map((d) => (
              <tr key={d._id} style={{ borderBottom: "1px solid var(--layout-border-color)" }}>
                <td className="py-2" style={{ width: 16 }}>
                  <span
                    style={{
                      display: "inline-block",
                      width: 12,
                      height: 12,
                      borderRadius: 3,
                      background: vibeColorVar(d.colorToken),
                    }}
                  />
                </td>
                <td className="py-2 font-semibold">{d.name}</td>
                <td className="py-2">
                  {longDate(d.startDate)} – {longDate(d.endDate)}
                  {d.isDepartureWindow ? " (window)" : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 style={{ font: "var(--font-h3-medium)" }}>Travellers & flights</h2>
        <table className="w-full" style={{ borderCollapse: "collapse", font: "var(--font-text2-normal)" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--layout-border-color)", textAlign: "left" }}>
              <th className="py-1">Name</th>
              <th className="py-1">Out</th>
              <th className="py-1">Home</th>
            </tr>
          </thead>
          <tbody>
            {travellers.map((t) => {
              const inbound = segments.find((s) => s.travellerId === t._id && s.direction === "inbound");
              const outbound = segments.find((s) => s.travellerId === t._id && s.direction === "outbound");
              const fmt = (s?: { flightDate: string; flightNumber?: string; airport?: string; status: string }) =>
                s
                  ? `${shortDate(s.flightDate)}${s.flightNumber ? ` · ${s.flightNumber}` : ""}${s.airport ? ` · ${s.airport}` : ""} (${s.status})`
                  : "—";
              return (
                <tr key={t._id} style={{ borderBottom: "1px solid var(--layout-border-color)" }}>
                  <td className="py-1 font-semibold">{t.name}</td>
                  <td className="py-1">{fmt(inbound)}</td>
                  <td className="py-1">{fmt(outbound)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section>
        <h2 style={{ font: "var(--font-h3-medium)" }}>Pinned notes</h2>
        {vibes.filter((v) => v.pinned).map((v) => {
          const dest = destinations.find((d) => d._id === v.destinationId);
          return (
            <p key={v._id} style={{ font: "var(--font-text2-normal)" }}>
              <strong>{dest?.name}:</strong> {v.body}
            </p>
          );
        })}
      </section>
    </div>
  );
}
