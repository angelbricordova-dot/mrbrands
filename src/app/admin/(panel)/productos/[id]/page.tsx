import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { IconArrowLeft } from "@/components/admin/icons";
import { ProductForm } from "@/components/admin/product-form";
import { getAdminProducts } from "@/lib/admin-data";

export const metadata: Metadata = { title: "Producto" };

async function EditProduct({ params }: { params: PageProps<"/admin/productos/[id]">["params"] }) {
  const [{ id }, products] = await Promise.all([params, getAdminProducts()]);
  const product = products.find((p) => p.id === id);
  if (!product) notFound();
  const brands = [...new Set(products.map((p) => p.brand))].sort();
  return (
    <>
      <header className="a-top">
        <div>
          <h1>{product.name}</h1>
          <p>
            {product.brand} · {product.active ? "visible en la tienda" : "oculto"}
          </p>
        </div>
      </header>
      <ProductForm key={product.id} product={product} brands={brands} />
    </>
  );
}

export default function EditProductPage(props: PageProps<"/admin/productos/[id]">) {
  return (
    <>
      <Link href="/admin/productos" className="a-btn a-btn--ghost a-btn--sm" style={{ marginBottom: "0.75rem", marginLeft: "-0.75rem" }}>
        <IconArrowLeft /> Productos
      </Link>
      <Suspense fallback={<div className="sk" style={{ minHeight: "60svh" }} aria-busy="true" />}>
        <EditProduct params={props.params} />
      </Suspense>
    </>
  );
}
