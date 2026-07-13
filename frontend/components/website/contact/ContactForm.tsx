"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { submitEnquiry } from "@/services/websiteService";
import { getErrorMessage } from "@/lib/errors";
import MagneticButton from "@/components/website/MagneticButton";

const BUDGET_BRACKETS = ["Under ₹10L", "₹10L – ₹25L", "₹25L – ₹50L", "₹50L – ₹1Cr", "₹1Cr +"];

const inputClass =
  "w-full bg-transparent border-b border-[var(--ds-border)] py-3 text-sm placeholder:text-[var(--ds-ink-soft)] focus:outline-none focus:border-[var(--ds-gold)] transition-colors";

export default function ContactForm() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    budget_range: "",
    message: "",
  });

  useEffect(() => {
    const service = searchParams.get("service");
    const product = searchParams.get("product");
    if (service) setForm((f) => ({ ...f, message: `I'd like to enquire about the "${service}" service package.` }));
    else if (product) setForm((f) => ({ ...f, message: `I'd like to enquire about the "${product}" product.` }));
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      setStatus("error");
      setErrorMsg("Please share your name and phone number.");
      return;
    }
    setStatus("submitting");
    setErrorMsg("");
    try {
      await submitEnquiry(form);
      setStatus("success");
      setForm({ name: "", phone: "", email: "", budget_range: "", message: "" });
    } catch (err) {
      setStatus("error");
      setErrorMsg(getErrorMessage(err));
    }
  }

  if (status === "success") {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="py-12">
        <p className="text-2xl md:text-3xl font-light mb-3" style={{ fontFamily: "var(--font-display)" }}>
          Thank you.
        </p>
        <p className="text-[var(--ds-ink-soft)]">
          Your enquiry has been received — our team will reach out shortly.
        </p>
        <button
          onClick={() => setStatus("idle")}
          className="mt-6 text-[11px] tracking-[0.14em] uppercase border-b border-[var(--ds-ink)] pb-1 hover:text-[var(--ds-gold)] hover:border-[var(--ds-gold)] transition-colors"
        >
          Submit another enquiry
        </button>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-7">
        <input
          type="text"
          placeholder="Full Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className={inputClass}
          required
        />
        <input
          type="tel"
          placeholder="Active Phone"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className={inputClass}
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-7">
        <input
          type="email"
          placeholder="Email Address"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className={inputClass}
        />
        <select
          value={form.budget_range}
          onChange={(e) => setForm({ ...form, budget_range: e.target.value })}
          className={`${inputClass} appearance-none`}
        >
          <option value="">Budget Bracket (optional)</option>
          {BUDGET_BRACKETS.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>

      <textarea
        placeholder="Tell us about your space…"
        rows={4}
        value={form.message}
        onChange={(e) => setForm({ ...form, message: e.target.value })}
        className={`${inputClass} resize-none`}
      />

      {status === "error" && <p className="text-sm text-red-500">{errorMsg}</p>}

      <MagneticButton
        type="submit"
        disabled={status === "submitting"}
        data-cursor="Send"
        className="inline-flex items-center px-7 py-3.5 bg-[var(--ds-ink)] text-[var(--ds-bg)] rounded-full text-[11px] tracking-[0.14em] uppercase font-medium disabled:opacity-60"
      >
        {status === "submitting" ? "Sending…" : "Submit Inquiry Form"}
      </MagneticButton>
    </form>
  );
}
