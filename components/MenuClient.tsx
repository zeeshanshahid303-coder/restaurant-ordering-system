"use client";

import { useEffect, useState } from "react";

export default function MenuClient({
  items,
  categories,
}: {
  items: any[];
  categories: any[];
}) {
  const [cart, setCart] = useState<Record<string, number>>({});

  useEffect(() => {
    const savedCart = localStorage.getItem("cart");

    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }

    localStorage.setItem(
      "menuItems",
      JSON.stringify(items)
    );
  }, [items]);
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode");

  if (mode) {
    localStorage.setItem("orderMode", mode);
  }
}, []);
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  const increase = (id: string) => {
    setCart((prev) => ({
      ...prev,
      [id]: (prev[id] || 0) + 1,
    }));
  };

  const decrease = (id: string) => {
    setCart((prev) => {
      const qty = (prev[id] || 0) - 1;

      if (qty <= 0) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }

      return {
        ...prev,
        [id]: qty,
      };
    });
  };

  const cartCount = Object.values(cart).reduce(
    (sum, qty) => sum + qty,
    0
  );

  return (
    <>
      {cartCount > 0 && (
        <a
          href="/cart"
          className="fixed bottom-5 right-5 bg-black text-white px-5 py-3 rounded-full shadow-lg z-50"
        >
          🛒 Cart ({cartCount})
        </a>
      )}

      {categories.map((category) => (
        <div key={category.id} className="mb-10">
          <h2 className="text-2xl font-semibold mb-4">
            {category.name}
          </h2>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {items
              .filter(
                (item) => item.category_id === category.id
              )
              .map((item) => (
                <div
                  key={item.id}
                  className="border rounded-xl p-4 shadow-md bg-white"
                >
                  {item.image_url && (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-48 object-cover rounded-lg mb-4"
                    />
                  )}

                  <h3 className="font-bold text-lg">
                    {item.name}
                  </h3>

                  <p className="text-gray-600 mt-2">
                    {item.description}
                  </p>

                  <p className="font-semibold text-xl mt-3">
                    ₹{item.price}
                  </p>

                  {item.is_sold_out ? (
                    <button
                      disabled
                      className="mt-4 bg-gray-400 text-white px-4 py-2 rounded"
                    >
                      Currently Unavailable
                    </button>
                  ) : cart[item.id] ? (
                    <div className="flex items-center gap-3 mt-4">
                      <button
                        onClick={() => decrease(item.id)}
                        className="bg-gray-200 px-3 py-1 rounded"
                      >
                        -
                      </button>

                      <span>{cart[item.id]}</span>

                      <button
                        onClick={() => increase(item.id)}
                        className="bg-black text-white px-3 py-1 rounded"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => increase(item.id)}
                      className="mt-4 bg-black text-white px-4 py-2 rounded"
                    >
                      Add
                    </button>
                  )}
                </div>
              ))}
          </div>
        </div>
      ))}
    </>
  );
}
