"use client";

// Tap-to-edit form for a destination bar — the mobile-friendly alternative to
// drag/resize, also reachable by clicking a bar on desktop. Admins edit dates
// and colour; contributors see a read-only summary of the stop.
import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import {
  Button,
  Modal,
  ModalBasicLayout,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Text,
  TextField,
} from "@vibe/core";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useElevation } from "@/components/identity/ElevationProvider";
import { useIdentity } from "@/components/identity/IdentityProvider";
import { PALETTE_TOKENS, vibeColorVar } from "@/lib/colors";
import { longDate } from "@/lib/dates";

interface BarEditModalProps {
  destination: {
    _id: string;
    name: string;
    colorToken: string;
    startDate: string;
    endDate: string;
  } | null;
  onClose: () => void;
}

export default function BarEditModal({ destination, onClose }: BarEditModalProps) {
  const { traveller, sessionToken } = useIdentity();
  const { ensureElevated } = useElevation();
  const updateDates = useMutation(api.destinations.updateDates);
  const recolor = useMutation(api.destinations.recolor);

  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [color, setColor] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (destination) {
      setStart(destination.startDate);
      setEnd(destination.endDate);
      setColor(destination.colorToken);
    }
  }, [destination]);

  if (!destination) return null;

  const canEdit = traveller != null && traveller.role !== "contributor" && sessionToken;
  const dirty =
    start !== destination.startDate || end !== destination.endDate || color !== destination.colorToken;

  const save = async () => {
    if (!sessionToken || !dirty || start > end) return;
    if (!(await ensureElevated())) return;
    setSaving(true);
    try {
      if (start !== destination.startDate || end !== destination.endDate) {
        await updateDates({
          sessionToken,
          destinationId: destination._id as Id<"destinations">,
          startDate: start,
          endDate: end,
        });
      }
      if (color !== destination.colorToken) {
        await recolor({
          sessionToken,
          destinationId: destination._id as Id<"destinations">,
          colorToken: color,
        });
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal id="bar-edit" show size="small" onClose={onClose}>
      <ModalBasicLayout>
        <ModalHeader title={destination.name} />
        <ModalContent>
          <div className="flex flex-col gap-3 pb-2">
            {canEdit ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <TextField title="From" type="date" size="small" value={start} onChange={setStart} />
                  <TextField title="To" type="date" size="small" value={end} onChange={setEnd} />
                </div>
                <div className="flex flex-col gap-1">
                  <Text type="text3" color="secondary">
                    Colour (Vibe palette)
                  </Text>
                  <div className="flex flex-wrap gap-1">
                    {PALETTE_TOKENS.map((token) => (
                      <button
                        key={token}
                        aria-label={`Colour ${token}`}
                        className="cursor-pointer border-none"
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: "var(--border-radius-small)",
                          background: vibeColorVar(token),
                          outline:
                            token === color
                              ? "2px solid var(--primary-color)"
                              : "1px solid var(--layout-border-color)",
                          outlineOffset: 1,
                        }}
                        onClick={() => setColor(token)}
                      />
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <Text type="text2" color="secondary">
                {longDate(destination.startDate)} – {longDate(destination.endDate)}. Only admins can
                move destination dates.
              </Text>
            )}
          </div>
        </ModalContent>
      </ModalBasicLayout>
      {canEdit ? (
        <ModalFooter
          primaryButton={{
            text: saving ? "Saving…" : "Save",
            onClick: () => void save(),
            disabled: !dirty || start > end || saving,
          }}
          secondaryButton={{ text: "Cancel", onClick: onClose }}
        />
      ) : (
        <ModalFooter primaryButton={{ text: "Close", onClick: onClose }} />
      )}
    </Modal>
  );
}
