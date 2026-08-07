import test from "node:test";
import assert from "node:assert/strict";
import { decisionState } from "../src/services/accountLifecycleService.js";
import { requireApprovedExpertAccount, requireApprovedPartnerAccount } from "../src/middlewares/approvalMiddleware.js";

const run = (middleware, auth) => new Promise((resolve) => middleware({ auth }, {}, resolve));

test("approval decisions produce consistent User and business-profile states", () => {
  assert.deepEqual(decisionState("approve"), { status: "active", approvalStatus: "approved", profileStatus: "approved", isActive: true });
  assert.deepEqual(decisionState("reject"), { status: "rejected", approvalStatus: "rejected", profileStatus: "rejected", isActive: false });
  assert.deepEqual(decisionState("suspend"), { status: "suspended", approvalStatus: "approved", profileStatus: "suspended", isActive: false });
  assert.deepEqual(decisionState("deactivate"), { status: "inactive", approvalStatus: "approved", profileStatus: "approved", isActive: false });
  assert.throws(() => decisionState("promote-admin"), /Decision must be/);
});

test("partner and expert dashboard guards require both approval and an active account", async () => {
  for (const middleware of [requireApprovedPartnerAccount, requireApprovedExpertAccount]) {
    assert.equal(await run(middleware, { status: "active", approvalStatus: "approved" }), undefined);
    assert.equal(await run(middleware, { status: "approved", approvalStatus: "approved" }), undefined);
    assert.equal((await run(middleware, { status: "pending", approvalStatus: "pending" })).statusCode, 403);
    assert.equal((await run(middleware, { status: "suspended", approvalStatus: "approved" })).statusCode, 403);
  }
});
