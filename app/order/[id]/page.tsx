"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

import { useParams } from "next/navigation";

export default function OrderTrackingPage() {
  const params = useParams();
  
  const [order, setOrder] = useState<any>(null);

  const loadOrder = async () => {
    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("id", String(params.id))
      .single();

    if (data) {
      setOrder(data);
    }
  };

  useEffect(() => {
    loadOrder();
    const interval = setInterval(() => {
  loadOrder();
}, 3000);

    const channel = supabase
      .channel("order-tracking")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
      (payload) => {
  console.log("Realtime update:", payload);
  loadOrder();
}
      )
      .subscribe((status) => {
  console.log("SUB STATUS:", status);
});

    return () => {
        clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  if (!order) {
    return <div className="p-6">Loading...</div>;
  }

  const getStatusText = () => {
    switch (order.status) {
      case "NEW":
        return "🆕 Order Received";
      case "PREPARING":
        return "👨‍🍳 Preparing";
      case "READY":
        return "🔔 Ready for Pickup / Serving";
      case "COMPLETED":
        return "✅ Served";
      case "CANCELLED":
        return "❌ Cancelled";
      default:
        return order.status;
    }
  };

  return (
    <main className="min-h-screen p-6 bg-gray-50">
      <h1 className="text-3xl font-bold mb-6">
        Order Tracking
      </h1>

      <div className="bg-white rounded-xl shadow p-6">
        <p className="mb-3">
          <strong>Order ID:</strong> {order.id}
        </p>

        <p className="text-2xl font-bold">
          {getStatusText()}
        </p>
      <a
  href="/menu"
  className="inline-block mt-4 bg-black text-white px-4 py-2 rounded"
>
  🍽 Back to Menu
</a>

{order.status === "COMPLETED" && (
  <div className="mt-4">
    <div className="text-green-600 font-bold mb-3">
      ✅ Order Served Successfully
    </div>

    <a
      href="/menu"
      className="inline-block bg-green-600 text-white px-4 py-2 rounded"
      onClick={() =>
        localStorage.removeItem("currentOrderId")
      }
    >
      🍽 Place New Order
    </a>
  </div>
)}  
      </div>
    </main>
  );
}