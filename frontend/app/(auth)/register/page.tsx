"use client";

import { useState } from "react";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  UserCircle,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerUser } from "@/services/authService";

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "designer",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await registerUser(formData);
      router.push("/login?registered=true");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-10">
          <img src="/logo4.png" alt="InteriorBill" className="mx-auto w-24 h-24 rounded-2xl mb-4 shadow-lg shadow-[#C8922A]/30 object-contain" />
          <h1 className="text-2xl font-black text-[#1C1C1C]">
            Create your account
          </h1>
          <p className="text-[#9A8F82] text-sm mt-1">
            Get started with InteriorBill
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl border border-[#EDE8DF] shadow-sm p-8">
          {error && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[11px] font-black text-[#6B6259] uppercase tracking-widest">
                Full Name
              </label>
              <div className="relative">
                <UserCircle
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9A8F82]"
                  size={16}
                />
                <input
                  required
                  type="text"
                  placeholder="Rajesh Kumar"
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                  className="w-full pl-10 pr-4 py-3 bg-[#FAF8F5] border border-[#EDE8DF] rounded-xl text-[14px] outline-none focus:border-[#C8922A] focus:ring-4 focus:ring-[#C8922A]/5 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black text-[#6B6259] uppercase tracking-widest">
                Email Address
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9A8F82]"
                  size={16}
                />
                <input
                  required
                  type="email"
                  placeholder="you@firm.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full pl-10 pr-4 py-3 bg-[#FAF8F5] border border-[#EDE8DF] rounded-xl text-[14px] outline-none focus:border-[#C8922A] focus:ring-4 focus:ring-[#C8922A]/5 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black text-[#6B6259] uppercase tracking-widest">
                Password
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9A8F82]"
                  size={16}
                />
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 8 characters"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full pl-10 pr-12 py-3 bg-[#FAF8F5] border border-[#EDE8DF] rounded-xl text-[14px] outline-none focus:border-[#C8922A] focus:ring-4 focus:ring-[#C8922A]/5 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9A8F82] hover:text-[#1C1C1C]"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black text-[#6B6259] uppercase tracking-widest">
                Role
              </label>
              <div className="relative">
                <ShieldCheck
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9A8F82]"
                  size={16}
                />
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                  className="w-full pl-10 pr-4 py-3 bg-[#FAF8F5] border border-[#EDE8DF] rounded-xl text-[14px] outline-none focus:border-[#C8922A] appearance-none"
                >
                  <option value="manager">Manager</option>
                  <option value="accountant">Accountant</option>
                  <option value="designer">Designer</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-[#C8922A] hover:bg-[#B07A20] text-white font-black rounded-xl shadow-lg shadow-[#C8922A]/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Creating
                  account...
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <p className="text-center text-[13px] text-[#9A8F82] mt-6">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-[#C8922A] font-bold hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
