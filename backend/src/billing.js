// Store and calculate quantities and money as scaled integers.  This avoids
// binary floating-point drift while matching the DECIMAL(…,2) database columns.
const SCALE = 100n;

function scaled(value, label) {
  const raw = String(value ?? 0).trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw))
    throw new TypeError(
      `${label} must be a non-negative decimal with at most 2 places`,
    );
  const [whole, fraction = ""] = raw.split(".");
  return BigInt(whole) * SCALE + BigInt((fraction + "00").slice(0, 2));
}

function fromScaled(value) {
  return Number(value) / Number(SCALE);
}

function roundHalfUp(numerator, denominator) {
  return (numerator + denominator / 2n) / denominator;
}

function lineAmounts(attendance) {
  const cowLitres =
    scaled(attendance.morning_cow_qty, "Cow quantity") +
    scaled(attendance.night_cow_qty, "Cow quantity");
  const buffaloLitres =
    scaled(attendance.morning_buffalo_qty, "Buffalo quantity") +
    scaled(attendance.night_buffalo_qty, "Buffalo quantity");
  const cowAmount = roundHalfUp(
    cowLitres * scaled(attendance.cow_rate, "Cow rate"),
    SCALE,
  );
  const buffaloAmount = roundHalfUp(
    buffaloLitres * scaled(attendance.buffalo_rate, "Buffalo rate"),
    SCALE,
  );
  return { cowLitres, buffaloLitres, cowAmount, buffaloAmount };
}

export function calculateAttendanceLine(attendance) {
  if (attendance.status !== "present")
    return {
      cowLitres: 0,
      buffaloLitres: 0,
      cowAmount: 0,
      buffaloAmount: 0,
      lineTotal: 0,
    };
  const { cowLitres, buffaloLitres, cowAmount, buffaloAmount } =
    lineAmounts(attendance);
  return {
    cowLitres: fromScaled(cowLitres),
    buffaloLitres: fromScaled(buffaloLitres),
    cowAmount: fromScaled(cowAmount),
    buffaloAmount: fromScaled(buffaloAmount),
    lineTotal: fromScaled(cowAmount + buffaloAmount),
  };
}

export function calculateBill(records) {
  const billable = records.filter((record) => record.status === "present");
  const lines = billable.map(calculateAttendanceLine);
  const totals = lines.reduce(
    (total, line) => ({
      cowLitres: total.cowLitres + scaled(line.cowLitres, "Cow quantity"),
      buffaloLitres:
        total.buffaloLitres + scaled(line.buffaloLitres, "Buffalo quantity"),
      totalAmount: total.totalAmount + scaled(line.lineTotal, "Line total"),
    }),
    { cowLitres: 0n, buffaloLitres: 0n, totalAmount: 0n },
  );
  return {
    cowLitres: fromScaled(totals.cowLitres),
    buffaloLitres: fromScaled(totals.buffaloLitres),
    totalLitres: fromScaled(totals.cowLitres + totals.buffaloLitres),
    totalAmount: fromScaled(totals.totalAmount),
    lines,
  };
}

export function calculateBalance(totalAmount, payments) {
  const total = scaled(totalAmount, "Bill total");
  const paidAmount = payments.reduce(
    (sum, payment) => sum + scaled(payment.amount, "Payment amount"),
    0n,
  );
  return {
    paidAmount: fromScaled(paidAmount),
    balance: fromScaled(total - paidAmount),
  };
}

export function isInBillingMonth(attendanceDate, month) {
  return (
    /^\d{4}-\d{2}$/.test(month) &&
    /^\d{4}-\d{2}-\d{2}$/.test(String(attendanceDate)) &&
    String(attendanceDate).slice(0, 7) === month
  );
}
