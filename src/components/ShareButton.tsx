import { useState } from 'react';

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
        className="btn btn-secondary !py-1.5 !px-3 text-xs"
      >
        {copied ? '✓ Copied' : '🔗 Copy Link'}
      </button>
      <button 
        onClick={handleWhatsApp}
        className="btn !py-1.5 !px-3 text-xs bg-green-600 hover:bg-green-500 text-white border-0 shadow-sm"
      >
        💬 WhatsApp
      </button>
    </div>
  );
}
