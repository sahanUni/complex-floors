interface Product {
  name: string;
  price: number;
}

export default async function Home() {
  const res = await fetch("http://localhost:8010/products");
  const products: Product[] = await res.json();

  return (
    <main style={{ fontFamily: "sans-serif", padding: "2rem" }}>
      <h1>Products</h1>
      <ul>
        {products.map((p) => (
          <li key={p.name}>
            {p.name} — ${p.price.toFixed(2)}
          </li>
        ))}
      </ul>
    </main>
  );
}
