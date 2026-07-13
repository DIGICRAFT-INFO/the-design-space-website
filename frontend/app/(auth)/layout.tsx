import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "InteriorBill Pro",
  description: "Proposal, Quotation & Invoicing System for Interior Design Firms",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
