/**
 * The four default roles every company gets at signup (SPEC.md section 3).
 * `permissions` is a flat capability list; the cadence builder, import
 * pipeline etc. check for the specific capability they need rather than
 * hard-coding a role name, so a custom role can be granted the same access.
 */
export const DEFAULT_ROLES = [
  {
    name: "owner",
    permissions: ["*"],
  },
  {
    name: "manager",
    permissions: [
      "import_leads",
      "manage_cadence",
      "assign_leads",
      "reassign_leads",
      "view_all_leads",
      "invite_users",
      "manage_roles",
    ],
  },
  {
    name: "advisor",
    permissions: ["view_own_leads", "log_activity", "handoff_to_closer"],
  },
  {
    name: "closer",
    permissions: ["view_assigned_leads", "log_activity", "set_won_lost"],
  },
] as const;

export type DefaultRoleName = (typeof DEFAULT_ROLES)[number]["name"];

/** Every capability a role (default or custom) can be granted. */
export const ALL_CAPABILITIES = [
  "import_leads",
  "manage_cadence",
  "assign_leads",
  "reassign_leads",
  "view_all_leads",
  "invite_users",
  "manage_roles",
  "view_own_leads",
  "log_activity",
  "handoff_to_closer",
  "view_assigned_leads",
  "set_won_lost",
] as const;

export type Capability = (typeof ALL_CAPABILITIES)[number];
