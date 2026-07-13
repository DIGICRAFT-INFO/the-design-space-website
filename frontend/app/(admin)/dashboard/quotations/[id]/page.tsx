"use client";

import { useEffect, useState, use } from "react";
import { Plus, Trash2, Save, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import API_BASE_URL from "@/lib/config";

const API_BASE = API_BASE_URL;

function getAuthHeaders(): HeadersInit {
  if (typeof window === "undefined") return { "Content-Type": "application/json" };
  const token = localStorage.getItem("access") || localStorage.getItem("access_token") || localStorage.getItem("token");
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

export default function QuotationEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [quotation, setQuotation] = useState<any>({
    quote_number: "", client_name: "", project_name: "", status: "draft",
    discount_type: "percentage", discount_value: "0", cgst_rate: "9", sgst_rate: "9", notes: ""
  });
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (id === "new") { setLoading(false); return; }
    fetch(`${API_BASE}/quotations/${id}/`, { headers: getAuthHeaders() })
      .then(res => res.json())
      .then(data => {
        setQuotation(data);
        setItems(data.items || []);
        setLoading(false);
      }).catch(() => router.push("/dashboard/quotations"));
  }, [id, router]);

  // Calculations Logic
  const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.quantity || 0) * parseFloat(item.rate || 0)), 0);
  const disc = parseFloat(quotation.discount_value || 0);
  const discountAmount = quotation.discount_type === "fixed" ? disc : (subtotal * disc) / 100;
  const taxableAmount = subtotal - discountAmount;
  const taxRate = parseFloat(quotation.cgst_rate) + parseFloat(quotation.sgst_rate);
  const totalTax = (taxableAmount * taxRate) / 100;
  const grandTotal = taxableAmount + totalTax;

  const handleSave = async () => {
    setSaving(true);
    const isNew = id === "new";
    const url = isNew ? `${API_BASE}/quotations/` : `${API_BASE}/quotations/${id}/`;
    
    const payload = {
      ...quotation,
      items: items,
      subtotal: subtotal.toFixed(2),
      total_tax: totalTax.toFixed(2),
      taxable_amount: taxableAmount.toFixed(2),
      grand_total: grandTotal.toFixed(2)
    };

    try {
      const res = await fetch(url, {
        method: isNew ? "POST" : "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert(isNew ? "Quotation Created!" : "Quotation Updated!");
        router.push("/dashboard/quotations");
      }
    } catch (err) { alert("Error saving data"); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-[#C8922A]" /></div>;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <Link href="/dashboard/quotations" className="flex items-center gap-2 text-[#9A8F82] hover:text-[#C8922A] transition-colors font-medium text-[14px]">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-[#1C1C1C] text-white px-6 py-2.5 rounded-xl font-bold text-[14px] hover:bg-black disabled:opacity-50 transition-all">
          {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
          {id === "new" ? "Create Quotation" : "Save Changes"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Client Header Card */}
          <div className="bg-white p-6 rounded-2xl border border-[#EDE8DF] shadow-sm grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-[#9A8F82] uppercase block mb-1">Client Name</label>
              <input value={quotation.client_name} onChange={e => setQuotation({...quotation, client_name: e.target.value})} className="w-full text-[15px] font-semibold outline-none border-b border-transparent focus:border-[#C8922A] py-1 transition-all" placeholder="Enter client name..." />
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#9A8F82] uppercase block mb-1">Project Name</label>
              <input value={quotation.project_name} onChange={e => setQuotation({...quotation, project_name: e.target.value})} className="w-full text-[15px] font-semibold outline-none border-b border-transparent focus:border-[#C8922A] py-1 transition-all" placeholder="Enter project name..." />
            </div>
          </div>

          {/* Items Table */}
          <div className="bg-white rounded-2xl border border-[#EDE8DF] shadow-sm overflow-hidden">
            <div className="grid grid-cols-[1fr_80px_100px_100px_40px] gap-4 p-4 bg-[#FAF8F5] border-b border-[#EDE8DF] text-[10px] font-bold text-[#9A8F82] uppercase">
              <div>Item Description</div>
              <div className="text-center">Qty</div>
              <div className="text-right">Rate (₹)</div>
              <div className="text-right">Total</div>
              <div />
            </div>
            <div className="divide-y divide-[#F5F2ED]">
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_80px_100px_100px_40px] gap-4 p-4 items-center group transition-colors hover:bg-[#FAF8F5]/50">
                  <input value={item.description} onChange={e => { const n = [...items]; n[idx].description = e.target.value; setItems(n); }} className="text-[13px] bg-transparent outline-none font-medium" placeholder="Describe work..." />
                  <input type="number" value={item.quantity} onChange={e => { const n = [...items]; n[idx].quantity = e.target.value; setItems(n); }} className="text-[13px] bg-transparent outline-none text-center" />
                  <input type="number" value={item.rate} onChange={e => { const n = [...items]; n[idx].rate = e.target.value; setItems(n); }} className="text-[13px] bg-transparent outline-none text-right font-medium" />
                  <div className="text-right text-[13px] font-bold text-[#1C1C1C]">₹{(parseFloat(item.quantity || 0) * parseFloat(item.rate || 0)).toLocaleString()}</div>
                  <button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-[#C8C0B5] hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
            <button onClick={() => setItems([...items, { description: "", quantity: 1, rate: 0 }])} className="w-full p-4 text-[13px] text-[#C8922A] font-bold flex items-center justify-center gap-2 hover:bg-[#FDF3E3] transition-colors border-t border-[#F5F2ED]">
              <Plus size={16} /> Add Work Item
            </button>
          </div>
        </div>

        {/* Totals Sidebar */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-[#EDE8DF] shadow-sm">
            <h3 className="text-[12px] font-bold text-[#1C1C1C] uppercase mb-4 tracking-wider">Financial Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-[14px] text-[#6B6259]"><span>Subtotal</span><span className="font-medium">₹{subtotal.toLocaleString()}</span></div>
              <div className="flex items-center justify-between">
                <span className="text-[14px] text-red-500">Discount ({quotation.discount_type === 'percentage' ? '%' : '₹'})</span>
                <input type="number" className="w-20 text-right text-[14px] font-medium bg-[#FAF8F5] rounded px-2 py-1 outline-none border border-[#EDE8DF]" value={quotation.discount_value} onChange={e => setQuotation({...quotation, discount_value: e.target.value})} />
              </div>
              <div className="pt-3 border-t border-[#F5F2ED] flex justify-between text-[14px] text-[#6B6259]"><span>Taxable Amount</span><span>₹{taxableAmount.toLocaleString()}</span></div>
              <div className="flex justify-between text-[14px] text-[#6B6259]"><span>GST ({taxRate}%)</span><span>₹{totalTax.toLocaleString()}</span></div>
              <div className="pt-4 border-t border-[#EDE8DF] flex justify-between items-center">
                <span className="text-[15px] font-bold text-[#1C1C1C]">Grand Total</span>
                <span className="text-[22px] font-extrabold text-[#C8922A]">₹{grandTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-[#EDE8DF] shadow-sm">
            <label className="text-[11px] font-bold text-[#9A8F82] uppercase block mb-2">Terms & Notes</label>
            <textarea value={quotation.notes} onChange={e => setQuotation({...quotation, notes: e.target.value})} className="w-full text-[13px] bg-transparent outline-none min-h-[100px] resize-none" placeholder="e.g. 50% advance, 50% on completion..." />
          </div>
        </div>
      </div>
    </div>
  );
}