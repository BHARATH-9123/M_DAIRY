import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateAttendanceLine,
  calculateBalance,
  calculateBill,
  isInBillingMonth,
} from "../src/billing.js";

const attendance = (overrides = {}) => ({
  status: "present",
  morning_cow_qty: 0,
  night_cow_qty: 0,
  morning_buffalo_qty: 0,
  night_buffalo_qty: 0,
  cow_rate: 0,
  buffalo_rate: 0,
  ...overrides,
});

test("calculates cow-only attendance at its saved rate", () => {
  const line = calculateAttendanceLine(
    attendance({ morning_cow_qty: 5, cow_rate: 2 }),
  );
  assert.deepEqual(line, {
    cowLitres: 5,
    buffaloLitres: 0,
    cowAmount: 10,
    buffaloAmount: 0,
    lineTotal: 10,
  });
});

test("calculates the documented morning cow and buffalo example", () => {
  const bill = calculateBill([
    attendance({
      morning_cow_qty: 5,
      morning_buffalo_qty: 2,
      cow_rate: 100,
      buffalo_rate: 200,
    }),
  ]);
  assert.equal(bill.cowLitres, 5);
  assert.equal(bill.buffaloLitres, 2);
  assert.equal(bill.totalLitres, 7);
  assert.equal(bill.totalAmount, 900);
});

test("calculates morning and night quantities exactly once at independent rates", () => {
  const bill = calculateBill([
    attendance({
      morning_cow_qty: 5,
      night_cow_qty: 10,
      morning_buffalo_qty: 2,
      night_buffalo_qty: 3,
      cow_rate: 100,
      buffalo_rate: 200,
    }),
  ]);
  assert.equal(bill.cowLitres, 15);
  assert.equal(bill.buffaloLitres, 5);
  assert.equal(bill.totalLitres, 20);
  assert.equal(bill.totalAmount, 2500);
});

test("includes two saved present days in one monthly calculation", () => {
  const bill = calculateBill([
    attendance({
      morning_cow_qty: 5,
      morning_buffalo_qty: 2,
      cow_rate: 100,
      buffalo_rate: 200,
    }),
    attendance({
      morning_cow_qty: 5,
      morning_buffalo_qty: 2,
      cow_rate: 100,
      buffalo_rate: 200,
    }),
  ]);
  assert.equal(bill.cowLitres, 10);
  assert.equal(bill.buffaloLitres, 4);
  assert.equal(bill.totalLitres, 14);
  assert.equal(bill.totalAmount, 1800);
});

test("recalculation includes a corrected second attendance day", () => {
  const firstDay = attendance({
    morning_cow_qty: 5,
    morning_buffalo_qty: 2,
    cow_rate: 100,
    buffalo_rate: 200,
  });
  const secondDay = attendance({
    morning_cow_qty: 3,
    morning_buffalo_qty: 1,
    cow_rate: 100,
    buffalo_rate: 200,
  });
  const draftAfterSecondDay = calculateBill([firstDay, secondDay]);
  assert.equal(draftAfterSecondDay.cowLitres, 8);
  assert.equal(draftAfterSecondDay.buffaloLitres, 3);
  assert.equal(draftAfterSecondDay.totalLitres, 11);
  assert.equal(draftAfterSecondDay.totalAmount, 1400);

  const revised = calculateBill([
    firstDay,
    { ...secondDay, morning_cow_qty: 4 },
  ]);
  assert.equal(revised.cowLitres, 9);
  assert.equal(revised.buffaloLitres, 3);
  assert.equal(revised.totalLitres, 12);
  assert.equal(revised.totalAmount, 1500);
});

test("uses half-up paise rounding for fractional litres", () => {
  const line = calculateAttendanceLine(
    attendance({ morning_cow_qty: 0.01, cow_rate: 0.5 }),
  );
  assert.equal(line.cowAmount, 0.01);
});

test("does not bill defaults when no attendance has been saved", () => {
  assert.deepEqual(calculateBill([]), {
    cowLitres: 0,
    buffaloLitres: 0,
    totalLitres: 0,
    totalAmount: 0,
    lines: [],
  });
});

test("uses vendor quantities and procurement rates independently", () => {
  const vendorBill = calculateBill([
    attendance({
      morning_cow_qty: 4,
      night_buffalo_qty: 3,
      cow_rate: 31.25,
      buffalo_rate: 48.5,
    }),
  ]);
  assert.equal(vendorBill.totalLitres, 7);
  assert.equal(vendorBill.totalAmount, 270.5);
});

test("includes only the exact billing month boundaries", () => {
  assert.equal(isInBillingMonth("2026-10-01", "2026-10"), true);
  assert.equal(isInBillingMonth("2026-10-31", "2026-10"), true);
  assert.equal(isInBillingMonth("2026-11-01", "2026-10"), false);
});

test("calculates buffalo-only attendance independently", () => {
  const line = calculateAttendanceLine(
    attendance({ night_buffalo_qty: 2.5, buffalo_rate: 64.75 }),
  );
  assert.equal(line.buffaloAmount, 161.88);
  assert.equal(line.lineTotal, 161.88);
});

test("combines cow and buffalo quantities and rates without double counting", () => {
  const bill = calculateBill([
    attendance({
      morning_cow_qty: 2,
      night_cow_qty: 1,
      morning_buffalo_qty: 1.5,
      cow_rate: 40,
      buffalo_rate: 60,
    }),
  ]);
  assert.equal(bill.cowLitres, 3);
  assert.equal(bill.buffaloLitres, 1.5);
  assert.equal(bill.totalLitres, 4.5);
  assert.equal(bill.totalAmount, 210);
});

test("excludes absent attendance and leaves missing dates out of the bill input", () => {
  const bill = calculateBill([
    attendance({ status: "absent", morning_cow_qty: 10, cow_rate: 99 }),
  ]);
  assert.equal(bill.totalLitres, 0);
  assert.equal(bill.totalAmount, 0);
  assert.equal(bill.lines.length, 0);
});

test("uses stored attendance rates after customer rates change", () => {
  const historical = calculateBill([
    attendance({ morning_cow_qty: 5, cow_rate: 2 }),
  ]);
  const later = calculateBill([
    attendance({ morning_cow_qty: 5, cow_rate: 70 }),
  ]);
  assert.equal(historical.totalAmount, 10);
  assert.equal(later.totalAmount, 350);
});

test("preserves the first present attendance rate when quantities are corrected", () => {
  const original = attendance({ morning_cow_qty: 5, cow_rate: 2 });
  const correctedQuantityAtCurrentRate = { ...original, morning_cow_qty: 6 };
  assert.equal(calculateBill([correctedQuantityAtCurrentRate]).totalAmount, 12);
});

test("derives partial payments and the outstanding balance from payment rows", () => {
  assert.deepEqual(
    calculateBalance(500, [{ amount: 125.5 }, { amount: 74.5 }]),
    { paidAmount: 200, balance: 300 },
  );
});
