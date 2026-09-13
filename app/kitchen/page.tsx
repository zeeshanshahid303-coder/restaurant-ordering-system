"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "../../lib/supabase";

// Formats a raw table_number value ("1", 1, or already "T01") into "T01" style.
function formatTableNumber(tableNumber: string | number | null | undefined): string {
  if (tableNumber === null || tableNumber === undefined || tableNumber === "") {
    return "—";
  }

  const str = String(tableNumber).trim();

  if (/^T\d+$/i.test(str)) {
    return str.toUpperCase();
  }

  const num = parseInt(str, 10);

  if (Number.isNaN(num)) {
    return str;
  }

  return `T${String(num).padStart(2, "0")}`;
}

function formatRequestType(type: string): string {
  if (type === "CALL_WAITER") return "Call Waiter";
  if (type === "REQUEST_BILL") return "Request Bill";
  return type;
}

export default function KitchenPage() {
  const [orders, setOrders] = useState<any[]>([]);
const [tableRequests, setTableRequests] = useState<any[]>([]);
const [soundEnabled, setSoundEnabled] = useState(false);
const soundEnabledRef = useRef(false);

const previousCountRef = useRef<number>(0);
const notifiedOrdersRef = useRef(new Set<string>());
const notifiedRequestsRef = useRef(new Set<string>());
const isFirstRequestLoadRef = useRef(true);
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

  const { data: tablesData, error: tablesError } = await supabase
    .from("tables")
    .select("id, table_number");

  if (tablesError) {
    console.error(tablesError);
    return;
  }

  const { data: requestsData, error: requestsError } = await supabase
    .from("table_requests")
    .select("*")
    .eq("status", "PENDING")
    .order("created_at", { ascending: true });

  if (requestsError) {
    console.error(requestsError);
    return;
  }

  const tableNumberById = new Map(
    tablesData.map((table) => [table.id, table.table_number])
  );

  const mergedOrders = ordersData.map((order) => ({
    ...order,
    order_items: orderItemsData.filter(
      (item) => item.order_id === order.id
    ),
    table_display: order.table_id
      ? formatTableNumber(tableNumberById.get(order.table_id))
      : "—",
  }));

  const mergedRequests = requestsData.map((request) => ({
    ...request,
    table_display: formatTableNumber(tableNumberById.get(request.table_id)),
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

// Table requests (Waiter Calls + Bill Requests) sound —
// plays once per newly-seen pending request, never on poll refreshes,
// and never for requests that were already pending on first page load.
if (isFirstRequestLoadRef.current) {
  mergedRequests.forEach((request) =>
    notifiedRequestsRef.current.add(request.id)
  );
  isFirstRequestLoadRef.current = false;
} else {
  const unseenRequests = mergedRequests.filter(
    (request) => !notifiedRequestsRef.current.has(request.id)
  );

  if (soundEnabledRef.current && unseenRequests.length > 0) {
    new Audio("/waiter-call.mp3").play();
  }

  unseenRequests.forEach((request) =>
    notifiedRequestsRef.current.add(request.id)
  );
}

setOrders(mergedOrders);
setTableRequests(mergedRequests);
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

  const requestsChannel = supabase
    .channel("kitchen-table-requests")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "table_requests",
      },
      () => {
        console.log("Table request realtime triggered");
        loadOrders();
      }
    )
    .subscribe();

  return () => {
    clearInterval(interval);
    supabase.removeChannel(channel);
    supabase.removeChannel(requestsChannel);
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

const resolveTableRequest = async (id: string) => {
  await supabase
    .from("table_requests")
    .update({
      status: "RESOLVED",
      resolved_at: new Date().toISOString(),
    })
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

const waiterCalls = tableRequests.filter(
  (request) => request.type === "CALL_WAITER"
);

const billRequests = tableRequests.filter(
  (request) => request.type === "REQUEST_BILL"
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

    {/* WAITER CALLS */}
    <h2 className="text-xl font-bold mb-4">
      🔔 Waiter Calls ({waiterCalls.length})
    </h2>

    <div className="space-y-4 mb-8">
      {waiterCalls.map((request) => (
        <div key={request.id} className="border rounded-xl p-4 bg-amber-50">
          <p><strong>Table:</strong> {request.table_display}</p>
          <p><strong>Requested:</strong> {new Date(request.created_at).toLocaleTimeString()}</p>

          <button
            onClick={() => resolveTableRequest(request.id)}
            className="bg-amber-600 text-white px-4 py-2 rounded mt-4"
          >
            ✅ Resolve
          </button>
        </div>
      ))}
    </div>

    {/* BILL REQUESTS */}
    <h2 className="text-xl font-bold mb-4">
      🧾 Bill Requests ({billRequests.length})
    </h2>

    <div className="space-y-4 mb-8">
      {billRequests.map((request) => (
        <div key={request.id} className="border rounded-xl p-4 bg-slate-50">
          <p><strong>Table:</strong> {request.table_display}</p>
          <p><strong>Type:</strong> {formatRequestType(request.type)}</p>
          <p><strong>Requested:</strong> {new Date(request.created_at).toLocaleTimeString()}</p>

          <button
            onClick={() => resolveTableRequest(request.id)}
            className="bg-slate-700 text-white px-4 py-2 rounded mt-4"
          >
            ✅ Resolve
          </button>
        </div>
      ))}
    </div>

    {/* NEW */}
    <h2 className="text-xl font-bold mb-4">
      🆕 New Orders ({newOrders.length})
    </h2>

    <div className="space-y-4 mb-8">
      {newOrders.map((order) => (
        <div key={order.id} className="border rounded-xl p-4">
          <p><strong>Order ID:</strong> {order.id}</p>
          <p><strong>Table:</strong> {order.table_display}</p>
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
          <p><strong>Table:</strong> {order.table_display}</p>
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
      <p><strong>Table:</strong> {order.table_display}</p>
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
          <p><strong>Table:</strong> {order.table_display}</p>
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