// app/orders/page.jsx
'use client';
import dynamic from 'next/dynamic';

const OrdersClient = dynamic(() => import('./OrdersClient'), { 
  ssr: false,
  loading: () => <div className="p-4 text-center">Loading orders...</div>
});

export default function Page() {
  return <OrdersClient />;
}