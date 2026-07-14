"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, ChevronDown, Save } from "lucide-react";
import { listProductsAdmin, createProduct, updateProduct, deleteProduct } from "@/services/webCmsService";
import type { WebProduct } from "@/services/websiteService";
import MediaUploadField from "@/components/webcms/MediaUploadField";
import Toast, { type ToastState } from "@/components/webcms/Toast";
import { getErrorMessage } from "@/lib/errors";

const CATEGORIES = [
  { value: "seating", label: "Seating" },
  { value: "lighting", label: "Light Fixtures" },
  { value: "kitchen_modules", label: "Kitchen Modules" },
  { value: "decor", label: "Decor" },
  { value: "other", label: "Other" },
];

const inputClass =
  "w-full px-3.5 py-2.5 rounded-lg border border-[#EDE8DF] bg-white text-[13px] focus:outline-none focus:border-[#C8922A]";
const labelClass = "text-[12px] font-semibold text-[#6B6259] mb-1.5 block";

let uid = 0;
const nextId = () => `new-${Date.now()}-${uid++}`;

export default function WebCmsProductsPage() {
  const [products, setProducts] = useState<WebProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  function load() {
    setLoading(true);
    listProductsAdmin()
      .then(setProducts)
      .catch((e) => setToast({ message: getErrorMessage(e), type: "error" }))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function handleCreate() {
    try {
      const created = await createProduct({ title: "New Product", category_tag: "other", item_images: [] });
      setProducts((s) => [created, ...s]);
      setOpenId(created.id);
    } catch (e) {
      setToast({ message: getErrorMessage(e), type: "error" });
    }
  }

  function patchLocal(id: string, patch: Partial<WebProduct>) {
    setProducts((list) => list.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function addImage(product: WebProduct) {
    patchLocal(product.id, { item_images: [...product.item_images, { id: nextId(), file_url: "", sort_order: product.item_images.length }] });
  }
  function updateImage(product: WebProduct, imgId: string, url: string) {
    patchLocal(product.id, { item_images: product.item_images.map((i) => (i.id === imgId ? { ...i, file_url: url } : i)) });
  }
  function removeImage(product: WebProduct, imgId: string) {
    patchLocal(product.id, { item_images: product.item_images.filter((i) => i.id !== imgId) });
  }

  async function handleSaveRow(product: WebProduct) {
    setSaving(product.id);
    try {
      const updated = await updateProduct(product.id, product);
      setProducts((list) => list.map((p) => (p.id === product.id ? updated : p)));
      setToast({ message: "Product saved", type: "success" });
    } catch (e) {
      setToast({ message: getErrorMessage(e), type: "error" });
    } finally {
      setSaving(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this product?")) return;
    try {
      await deleteProduct(id);
      setProducts((list) => list.filter((p) => p.id !== id));
    } catch (e) {
      setToast({ message: getErrorMessage(e), type: "error" });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-[#9A8F82]">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#2B2620]">Website CMS — Products</h1>
          <p className="text-[13px] text-[#9A8F82]">Bespoke furnishings catalog shown on the public Products page</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 bg-[#C8922A] hover:bg-[#B07A20] text-white text-[13px] font-semibold px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> New Product
        </button>
      </div>

      {products.length === 0 ? (
        <p className="text-[#9A8F82] text-sm">No products yet. Create your first one.</p>
      ) : (
        <div className="space-y-3">
          {products.map((product) => {
            const open = openId === product.id;
            return (
              <div key={product.id} className="bg-white border border-[#EDE8DF] rounded-2xl overflow-hidden">
                <button onClick={() => setOpenId(open ? null : product.id)} className="w-full flex items-center justify-between px-5 py-4 text-left">
                  <div>
                    <p className="text-[14px] font-semibold text-[#2B2620]">{product.title || "Untitled Product"}</p>
                    <p className="text-[11px] text-[#9A8F82] capitalize">
                      {product.category_tag.replace("_", " ")} · {product.is_published ? "Published" : "Draft"}
                    </p>
                  </div>
                  <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
                </button>

                {open && (
                  <div className="px-5 pb-5 border-t border-[#EDE8DF] pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className={labelClass}>Title</label>
                        <input className={inputClass} value={product.title} onChange={(e) => patchLocal(product.id, { title: e.target.value })} />
                      </div>
                      <div>
                        <label className={labelClass}>Category</label>
                        <select className={inputClass} value={product.category_tag} onChange={(e) => patchLocal(product.id, { category_tag: e.target.value as WebProduct["category_tag"] })}>
                          {CATEGORIES.map((c) => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                          ))}
                        </select>
                        {product.category_tag === "other" && (
                          <input
                            className={`${inputClass} mt-2`}
                            placeholder="Specify category (optional)"
                            value={product.category_label || ""}
                            onChange={(e) => patchLocal(product.id, { category_label: e.target.value })}
                          />
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className={labelClass}>Material Specs</label>
                        <input className={inputClass} value={product.material_specs} onChange={(e) => patchLocal(product.id, { material_specs: e.target.value })} />
                      </div>
                      <div>
                        <label className={labelClass}>Dimensions</label>
                        <input className={inputClass} placeholder='e.g. 180 × 90 × 75 cm' value={product.dimensions} onChange={(e) => patchLocal(product.id, { dimensions: e.target.value })} />
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className={labelClass}>Description</label>
                      <textarea rows={3} className={inputClass} value={product.description} onChange={(e) => patchLocal(product.id, { description: e.target.value })} />
                    </div>

                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className={labelClass}>Photos</label>
                        <button onClick={() => addImage(product)} className="flex items-center gap-1 text-[11px] font-semibold text-[#C8922A]">
                          <Plus size={12} /> Add photo
                        </button>
                      </div>
                      <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                        {product.item_images.map((img) => (
                          <div key={img.id} className="relative">
                            <MediaUploadField kind="image" aspect="aspect-square" value={img.file_url} onChange={(url) => updateImage(product, img.id, url)} />
                            <button
                              onClick={() => removeImage(product, img.id)}
                              className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-[12px] text-[#6B6259]">
                          <input type="checkbox" checked={product.is_in_stock} onChange={(e) => patchLocal(product.id, { is_in_stock: e.target.checked })} />
                          In stock
                        </label>
                        <label className="flex items-center gap-2 text-[12px] text-[#6B6259]">
                          <input type="checkbox" checked={product.is_published} onChange={(e) => patchLocal(product.id, { is_published: e.target.checked })} />
                          Published
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleDelete(product.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                          <Trash2 size={16} />
                        </button>
                        <button
                          onClick={() => handleSaveRow(product)}
                          disabled={saving === product.id}
                          className="flex items-center gap-2 bg-[#C8922A] hover:bg-[#B07A20] text-white text-[12px] font-semibold px-4 py-2 rounded-lg disabled:opacity-60"
                        >
                          {saving === product.id ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
