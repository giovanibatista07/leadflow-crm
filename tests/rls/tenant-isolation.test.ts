import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "pg";
import { adminClient, asUser } from "./helpers";

// These tests exercise real Postgres row-level security -- they try to read
// and edit another company's leads, and another advisor's leads, and expect
// every one of those attempts to come back empty / affect zero rows.
// Per CLAUDE.md: any success here must fail the build.

const ids = {
  companyA: randomUUID(),
  companyB: randomUUID(),
  roleAOwner: randomUUID(),
  roleAManager: randomUUID(),
  roleAAdvisor: randomUUID(),
  roleACloser: randomUUID(),
  roleBManager: randomUUID(),
  userAOwner: randomUUID(),
  userAManager: randomUUID(),
  userAAdvisor1: randomUUID(),
  userAAdvisor2: randomUUID(),
  userACloser: randomUUID(),
  userBManager: randomUUID(),
  leadA1: randomUUID(), // assigned to advisor1
  leadA2: randomUUID(), // assigned to advisor2
  leadB1: randomUUID(),
  activityA1: randomUUID(), // on leadA1, logged by advisor1
};

let admin: Client;

beforeAll(async () => {
  admin = adminClient();
  await admin.connect();

  await admin.query(
    `insert into companies (id, name, email_domain) values ($1, 'Company A', 'a-rls-test.example'), ($2, 'Company B', 'b-rls-test.example')`,
    [ids.companyA, ids.companyB],
  );

  const roles: [string, string, string][] = [
    [ids.roleAOwner, ids.companyA, "owner"],
    [ids.roleAManager, ids.companyA, "manager"],
    [ids.roleAAdvisor, ids.companyA, "advisor"],
    [ids.roleACloser, ids.companyA, "closer"],
    [ids.roleBManager, ids.companyB, "manager"],
  ];
  for (const [id, companyId, name] of roles) {
    await admin.query(
      `insert into roles (id, company_id, name, permissions) values ($1, $2, $3, '{}')`,
      [id, companyId, name],
    );
  }

  const users: [string, string, string, string][] = [
    [ids.userAOwner, ids.companyA, ids.roleAOwner, "owner@a-rls-test.example"],
    [ids.userAManager, ids.companyA, ids.roleAManager, "manager@a-rls-test.example"],
    [ids.userAAdvisor1, ids.companyA, ids.roleAAdvisor, "advisor1@a-rls-test.example"],
    [ids.userAAdvisor2, ids.companyA, ids.roleAAdvisor, "advisor2@a-rls-test.example"],
    [ids.userACloser, ids.companyA, ids.roleACloser, "closer@a-rls-test.example"],
    [ids.userBManager, ids.companyB, ids.roleBManager, "manager@b-rls-test.example"],
  ];
  for (const [id, companyId, roleId, email] of users) {
    await admin.query(
      `insert into users (id, name, email, company_id, role_id) values ($1, 'Fake Test User', $2, $3, $4)`,
      [id, email, companyId, roleId],
    );
  }

  await admin.query(
    `insert into leads (id, company_id, first_name, last_name, email, source, assigned_advisor_id)
     values ($1, $2, 'Jamie', 'Fake', 'jamie@fake.example', 'Indeed', $3)`,
    [ids.leadA1, ids.companyA, ids.userAAdvisor1],
  );
  await admin.query(
    `insert into leads (id, company_id, first_name, last_name, email, source, assigned_advisor_id)
     values ($1, $2, 'Morgan', 'Fake', 'morgan@fake.example', 'LinkedIn', $3)`,
    [ids.leadA2, ids.companyA, ids.userAAdvisor2],
  );
  await admin.query(
    `insert into leads (id, company_id, first_name, last_name, email, source)
     values ($1, $2, 'Taylor', 'Fake', 'taylor@fake.example', 'Other')`,
    [ids.leadB1, ids.companyB],
  );

  await admin.query(
    `insert into activities (id, company_id, lead_id, user_id, type, granola_note)
     values ($1, $2, $3, $4, 'call', 'secret granola note for lead A1')`,
    [ids.activityA1, ids.companyA, ids.leadA1, ids.userAAdvisor1],
  );
});

afterAll(async () => {
  await admin.query(`delete from companies where id in ($1, $2)`, [ids.companyA, ids.companyB]);
  await admin.end();
});

describe("leads: tenant isolation", () => {
  it("lets a manager see their own company's leads (sanity check)", async () => {
    const rows = await asUser(admin, ids.userAManager, async () => {
      const res = await admin.query(`select id from leads where company_id = $1`, [ids.companyA]);
      return res.rows;
    });
    expect(rows.map((r) => r.id).sort()).toEqual([ids.leadA1, ids.leadA2].sort());
  });

  it("blocks a manager from reading another company's leads", async () => {
    const rows = await asUser(admin, ids.userAManager, async () => {
      const res = await admin.query(`select id from leads where id = $1`, [ids.leadB1]);
      return res.rows;
    });
    expect(rows).toHaveLength(0);
  });

  it("blocks a manager from editing another company's leads", async () => {
    const result = await asUser(admin, ids.userAManager, async () => {
      return admin.query(`update leads set status = 'WON' where id = $1`, [ids.leadB1]);
    });
    expect(result.rowCount).toBe(0);

    const check = await admin.query(`select status from leads where id = $1`, [ids.leadB1]);
    expect(check.rows[0].status).toBe("NEW");
  });

  it("blocks an advisor from reading a lead assigned to another advisor", async () => {
    const rows = await asUser(admin, ids.userAAdvisor2, async () => {
      const res = await admin.query(`select id from leads where id = $1`, [ids.leadA1]);
      return res.rows;
    });
    expect(rows).toHaveLength(0);
  });

  it("blocks an advisor from editing a lead assigned to another advisor", async () => {
    const result = await asUser(admin, ids.userAAdvisor2, async () => {
      return admin.query(`update leads set current_step = 5 where id = $1`, [ids.leadA1]);
    });
    expect(result.rowCount).toBe(0);

    const check = await admin.query(`select current_step from leads where id = $1`, [ids.leadA1]);
    expect(check.rows[0].current_step).toBe(0);
  });

  it("lets an advisor read and edit their own assigned lead (sanity check)", async () => {
    const result = await asUser(admin, ids.userAAdvisor1, async () => {
      return admin.query(`update leads set current_step = 1 where id = $1`, [ids.leadA1]);
    });
    expect(result.rowCount).toBe(1);
  });

  it("blocks an unauthenticated session from reading any leads", async () => {
    const rows = await asUser(admin, null, async () => {
      const res = await admin.query(`select id from leads`);
      return res.rows;
    });
    expect(rows).toHaveLength(0);
  });
});

describe("activities: Granola note visibility", () => {
  it("blocks an advisor from reading another advisor's lead's activity", async () => {
    const rows = await asUser(admin, ids.userAAdvisor2, async () => {
      const res = await admin.query(`select id from activities where id = $1`, [ids.activityA1]);
      return res.rows;
    });
    expect(rows).toHaveLength(0);
  });

  it("lets the lead's own advisor read the activity (sanity check)", async () => {
    const rows = await asUser(admin, ids.userAAdvisor1, async () => {
      const res = await admin.query(`select id from activities where id = $1`, [ids.activityA1]);
      return res.rows;
    });
    expect(rows).toHaveLength(1);
  });

  it("lets a manager read any of their company's activities (sanity check)", async () => {
    const rows = await asUser(admin, ids.userAManager, async () => {
      const res = await admin.query(`select id from activities where id = $1`, [ids.activityA1]);
      return res.rows;
    });
    expect(rows).toHaveLength(1);
  });
});

describe("companies and users: tenant isolation", () => {
  it("blocks reading another company's row", async () => {
    const rows = await asUser(admin, ids.userAManager, async () => {
      const res = await admin.query(`select id from companies where id = $1`, [ids.companyB]);
      return res.rows;
    });
    expect(rows).toHaveLength(0);
  });

  it("blocks reading another company's users", async () => {
    const rows = await asUser(admin, ids.userAManager, async () => {
      const res = await admin.query(`select id from users where id = $1`, [ids.userBManager]);
      return res.rows;
    });
    expect(rows).toHaveLength(0);
  });
});
