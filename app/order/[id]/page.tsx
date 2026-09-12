"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function OrderTrackingPage({
  params,
}: {
  params: { id: string };
}) {
  const [order, setOrder] = useState<any>(null);

  const loadOrder = async () => {
    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("id", params.id)
      .single();

    if (data) {
      setOrder(data);
    }
  };

  useEffect(() => {
    loadOrder();

    const channel = supabase
      .channel("order-tracking")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => {
          loadOrder();
        }
      )
      .subscribe();

    return () => {
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
      </div>
    </main>
  );
}