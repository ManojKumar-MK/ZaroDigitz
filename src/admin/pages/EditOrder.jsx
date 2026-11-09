import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAdminData } from '../AdminData';
import OrderEditor from '../OrderEditor';

/** /admin/orders/:id/edit — full-page editor for a placed order. */
export default function EditOrder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { orders, ordersLoading } = useAdminData();
  const order = orders.find((o) => o.id === id);
  if (ordersLoading) return <p className="text-sm text-zinc-500">Loading order…</p>;
  if (!order) return <p className="text-sm text-zinc-500">Order not found. <Link to="/admin/orders" className="text-primary hover:underline">Back to orders</Link></p>;
  if (order.status === 'cancelled') return <p className="text-sm text-zinc-500">Cancelled orders cannot be edited. <Link to={`/admin/orders/${id}`} className="text-primary hover:underline">Back to the order</Link></p>;
  const back = () => navigate(`/admin/orders/${id}`);
  return <OrderEditor key={order.id} order={order} onDone={back} onCancel={back} />;
}
