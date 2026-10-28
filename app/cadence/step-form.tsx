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
    <form action={handleSubmit} className="space-y-3">
      <input type="hidden" name="cadenceId" value={cadenceId} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label>Step #</label>
          <input name="order" type="number" min={1} defaultValue={nextOrder} required />
        </div>
        <div>
          <label>Action</label>
          <select name="actionType" defaultValue="EMAIL">
            {CADENCE_ACTION_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Performed by</label>
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
        </div>
        <div>
          <label>Wait before next step (days, blank = end of sequence)</label>
          <input name="waitDays" type="number" min={0} />
        </div>
        <div>
          <label>Default time (HH:MM, optional)</label>
          <input name="defaultTime" type="text" placeholder="09:00" />
        </div>
      </div>
      <div>
        <label>Template text (optional)</label>
        <textarea name="templateText" rows={2} />
      </div>
      <button type="submit" disabled={pending}>
        {pending ? "Adding..." : "Add step"}
      </button>
      {error && <p className="form-error" role="alert">{error}</p>}
    </form>
  );
}
