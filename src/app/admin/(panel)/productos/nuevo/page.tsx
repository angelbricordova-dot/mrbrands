import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { IconArrowLeft } from "@/components/admin/icons";
import { ProductForm } from "@/components/admin/product-form";
import { getAdminProducts } from "@/lib/admin-data";

export const metadata: Metadata = { title: "Nuevo producto" };

async function NewProduct() {
  const products = await getAdminProducts();
  const brands = [...new Set(products.map((p) => p.brand))].sort();
  return <ProductForm brands={brands} />;
}

export default function NewProductPage() {
  return (
    <>
      <Link href="/admin/productos" className="a-btn a-btn--ghost a-btn--sm" style={{ marginBottom: "0.75rem", marginLeft: "-0.75rem" }}>
        <IconArrowLeft /> Productos
      </Link>
      <header className="a-top">
        <div>
          <h1>Nuevo producto</h1>
          <p>Fotos, tallas, unidades y precio. Aparece en la tienda apenas lo guardes.</p>
        </div>
      </header>
      <Suspense fallback={<div className="sk" style={{ minHeight: "60svh" }} aria-busy="true" />}>
        <NewProduct />
      </Suspense>
    </>
  );
}
