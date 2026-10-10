const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatINR = (amount) => inr.format(Number(amount) || 0);

export const rateLabel = (milkType) => `${milkType} rate (₹/L)`;
