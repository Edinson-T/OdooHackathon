import assert from "node:assert/strict";
import { test } from "node:test";
import { seed } from "../src/data/seed.ts";
import { key, load, save } from "../src/lib/storage.ts";

function storageWith(raw: string) {
  const records = new Map([[key, raw]]);
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (id: string) => records.get(id) ?? null,
      setItem: (id: string, value: string) => records.set(id, value),
    },
  });
  return records;
}

test("an older workspace keeps its records and its original backup through a save and reload", () => {
  const s = seed();
  delete s.assets[0].zoneId;
  const weatherJob = {
    ...s.jobs[0], id: "weather-job", triggers: [{ kind: "weather", key: "weather-job" }],
    weather: { ruleId: "rain", value: 85 }, dismissedAt: s.jobs[0].completedAt,
  };
  const saved = {
    ...s, scenario: undefined, jobs: [...s.jobs, weatherJob],
    complaints: [{ id: "report", assetId: s.assets[0].id, reporterId: s.users[0].id,
      description: "Drain blocked", status: "open", createdAt: s.assets[0].createdAt }],
    readings: [{ type: "flooding", value: 1, zoneId: "zone-0", observedAt: s.assets[0].createdAt }],
  };
  const raw = JSON.stringify(saved);
  const records = storageWith(raw);
  const recovered = load();
  assert.equal(records.get(key), raw);
  assert.equal(records.get(key + ":before-hazard-upgrade"), raw);
  save(recovered);
  const reloaded = load();
  assert.deepEqual(reloaded.assets, saved.assets);
  assert.deepEqual(reloaded.jobs, saved.jobs);
  assert.deepEqual(reloaded.complaints, saved.complaints);
  assert.deepEqual(reloaded.users, saved.users);
  assert.equal(records.get(key + ":before-hazard-upgrade"), raw);
});

test("an invalid field leaves the stored workspace available for recovery", () => {
  const s = seed();
  const raw = JSON.stringify({ ...s, assets: [{ ...s.assets[0], latitude: 999 }] });
  const records = storageWith(raw);
  assert.throws(load, /assets\.0\.latitude/);
  assert.equal(records.get(key), raw);
  assert.equal(records.size, 1);
});
