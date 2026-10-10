import { useState } from 'react';
import { Link2, Check, MessageCircle } from 'lucide-react';

export default function ShareButton({ roomName }: { roomName: string }) {
  const [copied, setCopied] = useState(false);
  const url = window.location.href;

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    const text = `Join my trip planning room "${roomName}" on WanderRoom! ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleCopy}
        className="btn btn-secondary !py-2 !px-3 text-xs gap-1.5"
        title="Copy link"
      >
        {copied
          ? <><Check size={13} style={{ color: '#10b981' }} /><span style={{ color: '#6ee7b7' }}>Copied</span></>
          : <><Link2 size={13} /><span>Copy Link</span></>
        }
      </button>
      <button
        onClick={handleWhatsApp}
        className="btn !py-2 !px-3 text-xs gap-1.5"
        style={{ background: '#16a34a', color: 'white', border: 'none', boxShadow: '0 4px 14px rgba(22,163,74,0.3)' }}
        title="Share on WhatsApp"
      >
        <MessageCircle size={13} />
        <span>WhatsApp</span>
      </button>
    </div>
  );
}
