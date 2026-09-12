"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "../../lib/supabase";

export default function KitchenPage() {
  const [orders, setOrders] = useState<any[]>([]);
const [soundEnabled, setSoundEnabled] = useState(false);
const soundEnabledRef = useRef(false);

const previousCountRef = useRef<number>(0);
const notifiedOrdersRef = useRef(new Set<string>());
const requestNotificationPermission = async () => {
  if ("Notification" in window) {
    await Notification.requestPermission();
  }
};
const loadOrders = async () => {
  const { data: ordersData, error: ordersError } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (ordersError) {
    console.error(ordersError);
    return;
  }

  const { data: orderItemsData, error: itemsError } = await supabase
    .from("order_items")
    .select(`
      *,
      menu_items (
        name
      )
    `);

  if (itemsError) {
    console.error(itemsError);
    return;
  }

  const mergedOrders = ordersData.map((order) => ({
    ...order,
    order_items: orderItemsData.filter(
      (item) => item.order_id === order.id
    ),
  }));

const newCount = mergedOrders.filter(
  (order) => order.status === "NEW"
).length;

console.log("PREVIOUS:", previousCountRef.current);
console.log("CURRENT:", newCount);

const currentNewOrders = mergedOrders.filter(
  (order) => order.status === "NEW"
);

const unseenOrders = currentNewOrders.filter(
  (order) => !notifiedOrdersRef.current.has(order.id)
);

if (
  soundEnabledRef.current &&
  unseenOrders.length > 0
) {
  new Audio("/notification.mp3").play();

  unseenOrders.forEach((order) =>
    notifiedOrdersRef.current.add(order.id)
  );

  if (Notification.permission === "granted") {
    new Notification("🍽 New Order Received!", {
      body: "A new order has arrived in the kitchen.",
    });
  }
}
console.log("SOUND ENABLED:", soundEnabledRef.current);
previousCountRef.current = newCount;


setOrders(mergedOrders);
};
useEffect(() => {
  loadOrders();

  const interval = setInterval(() => {
    loadOrders();
  }, 5000);

  const channel = supabase
    .channel("kitchen-orders")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "orders",
      },
      () => {
        console.log("Realtime triggered");
        loadOrders();
      }
    )
    .subscribe();

  return () => {
    clearInterval(interval);
    supabase.removeChannel(channel);
  };
}, []);

  const acceptOrder = async (id: string) => {
  await supabase
    .from("orders")
    .update({ status: "PREPARING" })
    .eq("id", id);

  loadOrders();
};

const rejectOrder = async (id: string) => {
  const reason = prompt(
    "Reason?\n\n1. Out of stock\n2. Outside delivery area\n3. Kitchen busy\n4. Restaurant closed\n5. Other"
  );

  if (!reason) return;

  await supabase
    .from("orders")
    .update({
      status: "CANCELLED",
      rejection_reason: reason,
    })
    .eq("id", id);

  loadOrders();
};
  const markReady = async (id: string) => {
    await supabase
      .from("orders")
      .update({ status: "READY" })
      .eq("id", id);

    loadOrders();
  };

  const completeOrder = async (id: string) => {
    await supabase
      .from("orders")
      .update({ status: "COMPLETED" })
      .eq("id", id);

    loadOrders();
  };

  const newOrders = orders.filter(
    (order) => order.status === "NEW"
  );
const preparingOrders = orders.filter(
  (order) => order.status === "PREPARING"
);

const readyOrders = orders.filter(
  (order) => order.status === "READY"
);

const completedOrders = orders.filter(
  (order) => order.status === "COMPLETED"
);
return (
  <main className="p-6">
    <h1 className="text-3xl font-bold mb-6">
      Kitchen Dashboard
    </h1>
<div className="mb-4">
  <button
   onClick={() => {
  const newValue = !soundEnabled;

  setSoundEnabled(newValue);
  soundEnabledRef.current = newValue;

if (newValue) {
  requestNotificationPermission();

  new Audio("/notification.mp3").play();
}
}}
    className={`px-4 py-2 rounded text-white ${
      soundEnabled ? "bg-green-600" : "bg-red-600"
    }`}
  >
    {soundEnabled
      ? "🔔 Notifications ON"
      : "🔕 Notifications OFF"}
  </button>
</div>
    {/* NEW */}
    <h2 className="text-xl font-bold mb-4">
      🆕 New Orders ({newOrders.length})
    </h2>

    <div className="space-y-4 mb-8">
      {newOrders.map((order) => (
        <div key={order.id} className="border rounded-xl p-4">
          <p><strong>Order ID:</strong> {order.id}</p>
          <p><strong>Mode:</strong> {order.order_mode}</p>

          {order.customer_name && (
            <p><strong>Customer:</strong> {order.customer_name}</p>
          )}

          {order.phone_number && (
            <p><strong>Phone:</strong> {order.phone_number}</p>
          )}

          {order.delivery_address && (
            <p><strong>Address:</strong> {order.delivery_address}</p>
          )}

          <p><strong>Total:</strong> ₹{order.total}</p>
{order.order_items?.length > 0 && (
  <div className="mt-3">
    <strong>Items:</strong>

    <ul className="ml-4 mt-2 list-disc">
      {order.order_items.map(
        (item: any, index: number) => (
          <li key={index}>
            {item.menu_items?.name} × {item.quantity}
          </li>
        )
      )}
    </ul>
  </div>
)}
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => acceptOrder(order.id)}
              className="bg-green-600 text-white px-4 py-2 rounded"
            >
              ✅ Accept
            </button>

            <button
              onClick={() => rejectOrder(order.id)}
              className="bg-red-600 text-white px-4 py-2 rounded"
            >
             ❌ Reject
</button>
</div>

</div>
))}
</div>

    {/* PREPARING */}
    <h2 className="text-xl font-bold mb-4">
      🍳 Preparing ({preparingOrders.length})
    </h2>

    <div className="space-y-4 mb-8">
      {preparingOrders.map((order) => (
        <div key={order.id} className="border rounded-xl p-4">
          <p><strong>Order ID:</strong> {order.id}</p>
          <p><strong>Total:</strong> ₹{order.total}</p>
{order.order_items?.length > 0 && (
  <div className="mt-3">
    <strong>Items:</strong>

    <ul className="ml-4 mt-2 list-disc">
      {order.order_items.map((item: any, index: number) => (
        <li key={index}>
          {item.menu_items?.name} × {item.quantity}
        </li>
      ))}
    </ul>
  </div>
)}

          <button
            onClick={() => markReady(order.id)}
            className="bg-blue-600 text-white px-4 py-2 rounded mt-4"
          >
            🍽 Mark Ready
          </button>
        </div>
      ))}
    </div>

{/* READY */}
<h2 className="text-xl font-bold mb-4">
  🍽 Ready ({readyOrders.length})
</h2>

<div className="space-y-4 mb-8">
  {readyOrders.map((order) => (
    <div key={order.id} className="border rounded-xl p-4">
      <p><strong>Order ID:</strong> {order.id}</p>
      <p><strong>Total:</strong> ₹{order.total}</p>

      {order.order_items?.length > 0 && (
        <div className="mt-3">
          <strong>Items:</strong>

          <ul className="ml-4 mt-2 list-disc">
            {order.order_items.map((item: any, index: number) => (
              <li key={index}>
                {item.menu_items?.name} × {item.quantity}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={() => completeOrder(order.id)}
        className="bg-green-700 text-white px-4 py-2 rounded mt-4"
      >
        ✅ Mark Completed
      </button>
    </div>
  ))}
</div>

    {/* COMPLETED */}
    <h2 className="text-xl font-bold mb-4">
      ✅ Completed ({completedOrders.length})
    </h2>

    <div className="space-y-4">
      {completedOrders.map((order) => (
        <div key={order.id} className="border rounded-xl p-4">
          <p><strong>Order ID:</strong> {order.id}</p>
          <p><strong>Total:</strong> ₹{order.total}</p>
{order.order_items?.length > 0 && (
  <div className="mt-3">
    <strong>Items:</strong>

    <ul className="ml-4 mt-2 list-disc">
      {order.order_items.map((item: any, index: number) => (
        <li key={index}>
          {item.menu_items?.name} × {item.quantity}
        </li>
      ))}
    </ul>
  </div>
)}          
        </div>
      ))}
    </div>
  </main>
);
}