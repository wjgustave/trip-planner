"use client";

// Inbound/outbound flight form for one traveller. Inbound arrival defaults to
// flight date + 1 (overnight flights UK -> Thailand), still editable.
import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { Button, Dropdown, Text, TextField } from "@vibe/core";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { addDays } from "@/lib/dates";

type Segment = Doc<"travelSegments">;
type Status = Segment["status"];

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: "idea", label: "Idea" },
  { value: "booked", label: "Booked" },
  { value: "confirmed", label: "Confirmed" },
];

interface FlightFormProps {
  travellerId: Id<"travellers">;
  direction: "inbound" | "outbound";
  segment?: Segment;
  sessionToken: string;
  /** False renders the form read-only (someone else's card, not admin). */
  canEdit: boolean;
  /** Called before saving someone else's flights (elevation gate). */
  beforeSave?: () => Promise<boolean>;
}

export default function FlightForm({
  travellerId,
  direction,
  segment,
  sessionToken,
  canEdit,
  beforeSave,
}: FlightFormProps) {
  const upsert = useMutation(api.travelSegments.upsert);

  const [flightDate, setFlightDate] = useState(segment?.flightDate ?? "");
  const [arrivalDate, setArrivalDate] = useState(segment?.arrivalDate ?? "");
  const [airport, setAirport] = useState(segment?.airport ?? "");
  const [flightNumber, setFlightNumber] = useState(segment?.flightNumber ?? "");
  const [status, setStatus] = useState<Status>(segment?.status ?? "idea");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Reflect reactive updates from other users when not mid-edit.
  useEffect(() => {
    if (segment) {
      setFlightDate(segment.flightDate);
      setArrivalDate(segment.arrivalDate);
      setAirport(segment.airport ?? "");
      setFlightNumber(segment.flightNumber ?? "");
      setStatus(segment.status);
    }
  }, [segment]);

  const dirty =
    flightDate !== (segment?.flightDate ?? "") ||
    arrivalDate !== (segment?.arrivalDate ?? "") ||
    airport !== (segment?.airport ?? "") ||
    flightNumber !== (segment?.flightNumber ?? "") ||
    status !== (segment?.status ?? "idea");

  const save = async () => {
    if (!flightDate) return;
    if (beforeSave && !(await beforeSave())) return;
    setSaving(true);
    try {
      await upsert({
        sessionToken,
        travellerId,
        direction,
        flightDate,
        arrivalDate: arrivalDate || (direction === "inbound" ? addDays(flightDate, 1) : flightDate),
        airport: airport || undefined,
        flightNumber: flightNumber || undefined,
        status,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Text type="text2" weight="medium">
        {direction === "inbound" ? "Getting there" : "Coming home"}
      </Text>
      <div className="grid grid-cols-2 gap-2">
        <TextField
          title="Flight date"
          type="date"
          size="small"
          value={flightDate}
          disabled={!canEdit}
          onChange={(value) => {
            setFlightDate(value);
            // Inbound arrives next day by default; outbound same day.
            if (direction === "inbound") setArrivalDate(value ? addDays(value, 1) : "");
            else setArrivalDate(value);
          }}
        />
        <TextField
          title={direction === "inbound" ? "Arrives (usually +1 day)" : "Lands home"}
          type="date"
          size="small"
          value={arrivalDate}
          disabled={!canEdit}
          onChange={setArrivalDate}
        />
        <TextField
          title="Airport"
          placeholder="e.g. BKK"
          size="small"
          value={airport}
          disabled={!canEdit}
          onChange={setAirport}
        />
        <TextField
          title="Flight no."
          placeholder="e.g. TG917"
          size="small"
          value={flightNumber}
          disabled={!canEdit}
          onChange={setFlightNumber}
        />
      </div>
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Dropdown
            size="small"
            clearable={false}
            searchable={false}
            disabled={!canEdit}
            value={STATUS_OPTIONS.find((o) => o.value === status)}
            options={STATUS_OPTIONS}
            onChange={(option: { value: Status } | null) => {
              if (option) setStatus(option.value);
            }}
          />
        </div>
        {canEdit && (
          <Button size="small" disabled={!dirty || !flightDate || saving} onClick={() => void save()}>
            {saving ? "Saving…" : saved ? "Saved ✓" : "Save"}
          </Button>
        )}
      </div>
    </div>
  );
}
