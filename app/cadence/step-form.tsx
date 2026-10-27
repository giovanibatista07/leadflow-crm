"use client";

import { useState } from "react";
import { CADENCE_ACTION_TYPES } from "@/lib/validation/cadence";
import { addCadenceStep } from "./actions";

export function StepForm({
  cadenceId,
  nextOrder,
  roles,
}: {
  cadenceId: string;
  nextOrder: number;
  roles: { id: string; name: string }[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await addCadenceStep(formData);
    setPending(false);
    if ("error" in result) setError(result.error);
  }

  return (
    <form action={handleSubmit}>
      <input type="hidden" name="cadenceId" value={cadenceId} />
      <label>
        Step #
        <input name="order" type="number" min={1} defaultValue={nextOrder} required />
      </label>
      <label>
        Action
        <select name="actionType" defaultValue="EMAIL">
          {CADENCE_ACTION_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>
      <label>
        Performed by
        <select name="assignedRoleId" required defaultValue="">
          <option value="" disabled>
            Choose a role
          </option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Wait before next step (days, blank = end of sequence)
        <input name="waitDays" type="number" min={0} />
      </label>
      <label>
        Default time (HH:MM, optional)
        <input name="defaultTime" type="text" placeholder="09:00" />
      </label>
      <label>
        Template text (optional)
        <textarea name="templateText" />
      </label>
      <button type="submit" disabled={pending}>
        {pending ? "Adding..." : "Add step"}
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
