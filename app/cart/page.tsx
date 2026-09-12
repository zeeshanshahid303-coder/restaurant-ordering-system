"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function CartPage() {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
const [customerName, setCustomerName] = useState("");
const [phoneNumber, setPhoneNumber] = useState("");
const [deliveryAddress, setDeliveryAddress] = useState("");
  useEffect(() => {
    const savedCart = localStorage.getItem("cart");

    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }

    const savedItems = localStorage.getItem("menuItems");

    if (savedItems) {
      setItems(JSON.parse(savedItems));
    }
  }, []);

  const cartItems = items.filter((item) => cart[item.id]);

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * cart[item.id],
    0
  );

  const totalItems = cartItems.reduce(
    (sum, item) => sum + cart[item.id],
    0
  );
const orderMode =
  typeof window !== "undefined"
    ? localStorage.getItem("orderMode") || "dine_in"
    : "dine_in";
const tableNumber =
  typeof window !== "undefined"
    ? localStorage.getItem("tableNumber")
    : null;

const tableToken =
  typeof window !== "undefined"
    ? localStorage.getItem("tableToken")
    : null;
    console.log("TABLE NUMBER:", tableNumber);
console.log("TABLE TOKEN:", tableToken);
const placeOrder = async () => {
console.log("TABLE NUMBER:", tableNumber);
console.log("TABLE TOKEN:", tableToken);
console.log("PLACE ORDER CLICKED");
  if (
    orderMode !== "dine_in" &&
    (!customerName.trim() || !phoneNumber.trim())
  ) {
    alert("Please enter name and phone number");
    return;
  }

  if (
    orderMode === "delivery" &&
    !deliveryAddress.trim()
  ) {
    alert("Please enter delivery address");
    return;
  }

  try {
let tableId = null;

if (tableNumber && tableToken) {
  const { data: tableData, error: tableError } = await supabase
    .from("tables")
    .select("*")
    .eq("table_number", tableNumber)
    .eq("qr_token", tableToken)
    .single();
alert(
  JSON.stringify({
    tableNumber,
    tableToken,
    tableData,
    tableError,
  })
);
  tableId = tableData?.id || null;
console.log("TABLE ID AFTER LOOKUP:", tableId);
  console.log("TABLE NUMBER:", tableNumber);
  console.log("TABLE TOKEN:", tableToken);
  console.log("TABLE ERROR:", tableError);
  console.log("TABLE DATA:", tableData);
  console.log("TABLE ID:", tableId);
}
      setLoading(true);
console.log("FINAL TABLE ID:", tableId);
console.log("TABLE ID BEFORE ORDER INSERT:", tableId);
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
  order_mode: orderMode,
  status: "NEW",

  customer_name:
    orderMode === "dine_in"
      ? null
      : customerName,

  phone_number:
    orderMode === "dine_in"
      ? null
      : phoneNumber,

  delivery_address:
    orderMode === "delivery"
      ? deliveryAddress
      : null,

  subtotal: subtotal,
  table_id: tableId,
  total: subtotal,
})
        .select()
        .single();

      if (orderError) {
        alert(orderError.message);
        return;
      }
const orderItems =
       cartItems.map((item) => ({
        order_id: order.id,
        menu_item_id: item.id,
        quantity: cart[item.id],
        unit_price: item.price,
        total_price: item.price * cart[item.id],
      }));
const { error: itemsError } = await supabase
  .from("order_items")
  .insert(orderItems);
  console.log("ORDER ID:", order.id);
console.log("ORDER ITEMS TO INSERT:", orderItems);
console.log("ITEMS ERROR:", itemsError);
console.log("ORDER ITEMS SENT:", orderItems);
if (itemsError) {
  alert(itemsError.message);
  return;
}

localStorage.removeItem("cart");
localStorage.removeItem("cartItems");

setCart({});
localStorage.setItem("currentOrderId", order.id);

window.location.href = `/order/${order.i}`;
    } catch (error) {
      console.error(error);
      alert("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-6">
      <h1 className="text-4xl font-bold mb-8">
        Your Cart
      </h1>

      <a
        href="/menu"
        className="inline-block mb-6 bg-gray-200 px-4 py-2 rounded"
      >
        ← Back to Menu
      </a>

      {cartItems.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        <>
          <div className="space-y-4">
            {cartItems.map((item) => (
              <div
                key={item.id}
                className="border rounded-xl p-4"
              >
                <h2 className="font-bold">
                  {item.name}
                </h2>

                <p>
                  Quantity: {cart[item.id]}
                </p>

                <p>
                  ₹{item.price} × {cart[item.id]}
                </p>

                <p className="font-semibold">
                  ₹{item.price * cart[item.id]}
                </p>
              </div>
            ))}
          </div>
<div className="mt-6 space-y-4">
  {orderMode !== "dine_in" && (
    <>
      <input
        type="text"
        placeholder="Customer Name"
        value={customerName}
        onChange={(e) => setCustomerName(e.target.value)}
        className="w-full border p-3 rounded"
      />

      <input
        type="text"
        placeholder="Phone Number"
        value={phoneNumber}
        onChange={(e) => setPhoneNumber(e.target.value)}
        className="w-full border p-3 rounded"
      />
    </>
  )}

  {orderMode === "delivery" && (
    <textarea
      placeholder="Delivery Address"
      value={deliveryAddress}
      onChange={(e) => setDeliveryAddress(e.target.value)}
      className="w-full border p-3 rounded"
    />
  )}
</div>
          <div className="mt-8 border-t pt-4">
            <p>
              Total Items: {totalItems}
            </p>

            <p className="text-2xl font-bold">
              Total: ₹{subtotal}
            </p>

            <button
              onClick={placeOrder}
              disabled={loading}
              className="mt-4 bg-black text-white px-6 py-3 rounded"
            >
              {loading ? "Placing Order..." : "Place Order"}
            </button>
          </div>
        </>
      )}
    </main>
  );
}