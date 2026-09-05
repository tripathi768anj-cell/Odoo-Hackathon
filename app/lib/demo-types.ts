// Shared types and seed data for the still-unwired prototype pages relocated from the
// original single-file app/page.tsx. These pages are local-state-only demos (rule 9 of the
// migration task) — they do not talk to the backend, so each page seeds its own copy of this
// state independently.

export type LineItem = {
  id: string;
  product: string;
  category: string;
  qty: number;
  price: number;
  discount: number;
  cap: number;
};

export type QuoteStage = "Draft" | "Pending approval" | "Approved" | "Fulfillment" | "Subscribed" | "Invoiced" | "Paid";

export const INITIAL_LINES: LineItem[] = [
  { id: "lp14", product: "Laptop Pro 14", category: "Hardware", qty: 2, price: 1200, discount: 12, cap: 15 },
  { id: "setup", product: "Onsite Setup Service", category: "Services", qty: 1, price: 450, discount: 16, cap: 10 },
  { id: "warranty", product: "Extended Warranty 2-Year", category: "Warranty", qty: 1, price: 180, discount: 10, cap: 10 }
];

export const money = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);

export const percent = (value: number) => `${value.toFixed(1)}%`;
