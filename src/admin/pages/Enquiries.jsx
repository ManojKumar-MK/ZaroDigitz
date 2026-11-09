import { FaWhatsapp } from 'react-icons/fa';
import { useAdminData } from '../AdminData';
import { updateEnquiry } from '../../firebase/orders';
import { Badge, Button, Card, Empty, fmtDateTime } from '../ui';

export default function Enquiries() {
  const { enquiries } = useAdminData();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Enquiries</h1>
        <p className="text-sm text-zinc-500">Messages sent from the Contact page</p>
      </div>
      <Card>
        {enquiries.length === 0 ? <Empty title="No enquiries yet" /> : (
          <ul className="divide-y divide-zinc-100 -m-5">
            {enquiries.map((e) => {
              const wa = e.mobile ? `https://wa.me/${e.mobile.length === 10 ? `91${e.mobile}` : e.mobile}?text=${encodeURIComponent(`Hi ${e.name || ''}, this is Zaro Digitz replying to your enquiry on our website.`)}` : null;
              return (
                <li key={e.id} className="p-5 flex flex-col md:flex-row md:items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-zinc-900">{e.name || 'Anonymous'}</span>
                      <Badge value={e.status || 'open'} />
                      <span className="text-xs text-zinc-400">{fmtDateTime(e.createdAt)}</span>
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5">{e.mobile}{e.email ? ` · ${e.email}` : ''}</div>
                    <p className="text-sm text-zinc-700 mt-2 whitespace-pre-wrap">{e.message}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg text-sm font-medium bg-[#25D366] hover:bg-[#1ebe5b] text-white"><FaWhatsapp size={16} /> WhatsApp</a>}
                    <Button variant="secondary" onClick={() => updateEnquiry(e.id, { status: e.status === 'resolved' ? 'open' : 'resolved' })}>{e.status === 'resolved' ? 'Reopen' : 'Resolve'}</Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
