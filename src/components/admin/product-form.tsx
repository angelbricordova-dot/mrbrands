"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { deleteProduct, saveProduct, setProductActive, uploadImage } from "@/app/admin/actions";
import { CATEGORIES, type Category, type Product, type Variant } from "@/lib/types";
import { IconArrowLeft, IconArrowRight, IconPlus, IconTrash } from "./icons";

const PRESETS: { label: string; sizes: string[] }[] = [
  { label: "S a XL", sizes: ["S", "M", "L", "XL"] },
  { label: "XS a XXL", sizes: ["XS", "S", "M", "L", "XL", "XXL"] },
  { label: "Cintura 28 a 36", sizes: ["28", "30", "32", "34", "36"] },
  { label: "Talla única", sizes: ["Única"] },
];

/** Resizes and re-encodes a photo in the browser so uploads stay small (about 100–250 KB). */
async function compress(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const webp = canvas.toDataURL("image/webp", 0.82);
  return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", 0.84);
}

export function ProductForm({ product, brands }: { product?: Product; brands: string[] }) {
  const router = useRouter();
  const [name, setName] = useState(product?.name ?? "");
  const [brand, setBrand] = useState(product?.brand ?? "");
  const [category, setCategory] = useState<Category>(product?.category ?? "franelas");
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [variants, setVariants] = useState<Variant[]>(product?.variants ?? [{ size: "S", stock: 0 }, { size: "M", stock: 0 }, { size: "L", stock: 0 }, { size: "XL", stock: 0 }]);
  const [active, setActive] = useState(product?.active ?? true);
  const [featured, setFeatured] = useState(product?.featured ?? false);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [uploading, setUploading] = useState(0);
  const [over, setOver] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const total = variants.reduce((n, v) => n + (Number.isFinite(v.stock) ? v.stock : 0), 0);

  const addFiles = async (files: FileList | File[]) => {
    const list = [...files].filter((f) => f.type.startsWith("image/")).slice(0, 8 - images.length);
    if (!list.length) return;
    setUploading((n) => n + list.length);
    for (const file of list) {
      try {
        const dataUrl = await compress(file);
        const r = await uploadImage(dataUrl);
        if (r.ok) setImages((cur) => [...cur, r.url]);
        else setMessage({ ok: false, text: r.error });
      } catch {
        setMessage({ ok: false, text: "No se pudo leer una de las fotos. Prueba con JPG o PNG." });
      } finally {
        setUploading((n) => n - 1);
      }
    }
  };

  const move = (i: number, dir: -1 | 1) =>
    setImages((cur) => {
      const next = [...cur];
      const j = i + dir;
      if (j < 0 || j >= next.length) return cur;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const setVariant = (i: number, patch: Partial<Variant>) => setVariants((cur) => cur.map((v, k) => (k === i ? { ...v, ...patch } : v)));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setFields({});
    start(async () => {
      const r = await saveProduct({
        id: product?.id,
        name,
        brand,
        category,
        price: price.trim() === "" ? Number.NaN : Number(price.replace(",", ".")),
        description,
        images,
        variants: variants.map((v) => ({ size: v.size, stock: Math.max(0, Math.floor(Number(v.stock) || 0)) })),
        active,
        featured,
      });
      if (r.ok) {
        setMessage({ ok: true, text: r.message ?? "Guardado." });
        if (!product && r.id) router.replace(`/admin/productos/${r.id}`);
      } else {
        setMessage({ ok: false, text: r.error });
        setFields(r.fields ?? {});
      }
    });
  };

  const err = (k: string) => fields[k];

  return (
    <form onSubmit={submit} noValidate>
      <div className="a-grid">
        <div className="span-7" style={{ display: "grid", gap: "var(--a-gap)" }}>
          <section className="a-panel" aria-labelledby="datos">
            <div className="a-panel__head">
              <h2 id="datos">Datos</h2>
            </div>
            <div className="a-fields">
              <label className="a-field full">
                <span>Nombre</span>
                <input className="a-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Camiseta Brand World Roja" aria-invalid={err("name") ? true : undefined} />
                {err("name") && <span className="a-err">{err("name")}</span>}
              </label>
              <label className="a-field">
                <span>Marca</span>
                <input className="a-input" list="brands" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Carpediem" aria-invalid={err("brand") ? true : undefined} />
                <datalist id="brands">
                  {brands.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
                {err("brand") && <span className="a-err">{err("brand")}</span>}
              </label>
              <label className="a-field">
                <span>Categoría</span>
                <select className="a-input" value={category} onChange={(e) => setCategory(e.target.value as Category)}>
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="a-field">
                <span>Precio en dólares (tasa BCV)</span>
                <input className="a-input a-input--money" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="25" aria-invalid={err("price") ? true : undefined} />
                {err("price") && <span className="a-err">{err("price")}</span>}
              </label>
              <label className="a-field full">
                <span>Descripción</span>
                <textarea className="a-input" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={600} placeholder="Tela, corte, cómo queda…" />
                <small>{description.length}/600</small>
              </label>
            </div>
          </section>

          <section className="a-panel" aria-labelledby="fotos">
            <div className="a-panel__head">
              <h2 id="fotos">Fotos</h2>
              <span className="a-hint">La primera es la portada · hasta 8</span>
            </div>
            <div className="p-images">
              {images.map((src, i) => (
                <div className="p-image" key={src}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`Foto ${i + 1}`} width={240} height={300} />
                  {i === 0 && <span className="p-image__main">Portada</span>}
                  <div className="p-image__tools">
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Mover antes">
                      <IconArrowLeft width={16} height={16} />
                    </button>
                    <button type="button" onClick={() => setImages((cur) => cur.filter((x) => x !== src))} aria-label="Quitar foto">
                      <IconTrash width={16} height={16} />
                    </button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === images.length - 1} aria-label="Mover después">
                      <IconArrowRight width={16} height={16} />
                    </button>
                  </div>
                </div>
              ))}
              {Array.from({ length: uploading }, (_, i) => (
                <div key={`up-${i}`} className="p-image sk" aria-label="Subiendo foto" />
              ))}
              {images.length + uploading < 8 && (
                <label
                  className={`p-drop ${over ? "is-over" : ""}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setOver(true);
                  }}
                  onDragLeave={() => setOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setOver(false);
                    void addFiles(e.dataTransfer.files);
                  }}
                >
                  <input ref={fileRef} type="file" accept="image/*" multiple onChange={(e) => e.target.files && void addFiles(e.target.files).then(() => fileRef.current && (fileRef.current.value = ""))} />
                  <span>
                    <IconPlus width={22} height={22} style={{ margin: "0 auto 0.35rem" }} />
                    <strong>Agregar fotos</strong>
                    <br />o arrástralas aquí
                  </span>
                </label>
              )}
            </div>
            {err("images") && (
              <p className="a-err" style={{ marginTop: "0.5rem" }}>
                {err("images")}
              </p>
            )}
          </section>
        </div>

        <div className="span-5" style={{ display: "grid", gap: "var(--a-gap)" }}>
          <section className="a-panel" aria-labelledby="tallas">
            <div className="a-panel__head">
              <h2 id="tallas">Tallas y stock</h2>
            </div>
            <div className="a-seg" style={{ marginBottom: "0.85rem" }} role="group" aria-label="Plantillas de tallas">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setVariants(p.sizes.map((size) => ({ size, stock: variants.find((v) => v.size === size)?.stock ?? 0 })))}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <table className="sizes-table">
              <thead>
                <tr>
                  <th>Talla</th>
                  <th>Unidades</th>
                  <th>
                    <span className="sr-only">Quitar</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {variants.map((v, i) => (
                  <tr key={i}>
                    <td>
                      <input className="a-input" value={v.size} onChange={(e) => setVariant(i, { size: e.target.value })} aria-label="Talla" maxLength={12} />
                    </td>
                    <td>
                      <input
                        className="a-input a-input--money"
                        inputMode="numeric"
                        value={Number.isFinite(v.stock) ? String(v.stock) : ""}
                        onChange={(e) => setVariant(i, { stock: e.target.value === "" ? Number.NaN : Math.max(0, Math.floor(Number(e.target.value.replace(/\D/g, "")) || 0)) })}
                        aria-label={`Unidades de talla ${v.size}`}
                      />
                    </td>
                    <td>
                      <button type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={() => setVariants((cur) => cur.filter((_, k) => k !== i))} disabled={variants.length === 1} aria-label={`Quitar talla ${v.size}`}>
                        <IconTrash />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem" }}>
              <button type="button" className="a-btn a-btn--sm" onClick={() => setVariants((cur) => [...cur, { size: "", stock: 0 }])}>
                <IconPlus /> Agregar talla
              </button>
              <span className="stock-total nums">{total} en total</span>
            </div>
            {err("variants") && <p className="a-err">{err("variants")}</p>}
          </section>

          <section className="a-panel" aria-labelledby="visibilidad">
            <div className="a-panel__head">
              <h2 id="visibilidad">En la tienda</h2>
            </div>
            <div style={{ display: "grid", gap: "0.5rem" }}>
              <label className="a-switch">
                <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
                Visible en la tienda
              </label>
              <label className="a-switch">
                <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
                Destacado (sale más grande en el catálogo)
              </label>
            </div>
            {product && (
              <p className="a-hint" style={{ marginTop: "0.75rem" }}>
                <a href={`/producto/${product.slug}`} target="_blank" rel="noreferrer">
                  Ver en la tienda ↗
                </a>
              </p>
            )}
          </section>

          {product && (
            <section className="a-panel" aria-labelledby="borrar">
              <div className="a-panel__head">
                <h2 id="borrar">Borrar</h2>
              </div>
              {confirmDelete ? (
                <div className="confirm-row">
                  <p>¿Borrar {product.name} para siempre? Los pedidos que ya lo tienen no cambian.</p>
                  <button type="button" className="a-btn a-btn--primary a-btn--sm" disabled={pending} onClick={() => start(async () => void (await deleteProduct(product.id)))}>
                    Sí, borrar
                  </button>
                  <button type="button" className="a-btn a-btn--sm" onClick={() => setConfirmDelete(false)}>
                    No
                  </button>
                </div>
              ) : (
                <>
                  <p className="a-hint" style={{ marginBottom: "0.75rem" }}>
                    Si solo se agotó, mejor ocúltalo: así conservas fotos y datos para cuando vuelva.
                  </p>
                  <button type="button" className="a-btn a-btn--danger" onClick={() => setConfirmDelete(true)}>
                    <IconTrash /> Borrar producto
                  </button>
                </>
              )}
            </section>
          )}
        </div>
      </div>

      <div className="savebar">
        <span className={`savebar__msg ${message ? (message.ok ? "is-ok" : "is-err") : ""}`} role="status">
          {message?.text}
        </span>
        <button type="submit" className="a-btn a-btn--primary a-btn--lg" disabled={pending || uploading > 0} aria-busy={pending}>
          {pending ? "Guardando…" : uploading > 0 ? "Subiendo fotos…" : product ? "Guardar cambios" : "Crear producto"}
        </button>
      </div>
    </form>
  );
}

export function ActiveSwitch({ id, active, name }: { id: string; active: boolean; name: string }) {
  const [on, setOn] = useState(active);
  const [pending, start] = useTransition();
  return (
    <label className="a-switch" title={on ? "Visible en la tienda" : "Oculto"}>
      <input
        type="checkbox"
        checked={on}
        disabled={pending}
        aria-label={`${name} visible en la tienda`}
        onChange={(e) => {
          const next = e.target.checked;
          setOn(next);
          start(async () => {
            const r = await setProductActive(id, next);
            if (!r.ok) setOn(!next);
          });
        }}
      />
      <span className="sr-only">{on ? "Visible" : "Oculto"}</span>
    </label>
  );
}
