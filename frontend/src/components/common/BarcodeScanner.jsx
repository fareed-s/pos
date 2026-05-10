import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { HiOutlineX, HiOutlineCamera, HiOutlineRefresh } from 'react-icons/hi';

// Camera-based barcode/QR scanner. Mounts only when isOpen=true so the
// camera permission prompt doesn't fire on every page load. On scan success
// we fire onScan(text) and stop the camera; the parent decides what to do.
export default function BarcodeScanner({ isOpen, onClose, onScan }) {
  const containerId = 'barcode-scanner-region';
  const scannerRef = useRef(null);
  const [error, setError] = useState('');
  const [cameraId, setCameraId] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    (async () => {
      setStarting(true);
      setError('');
      try {
        const list = await Html5Qrcode.getCameras();
        if (cancelled) return;
        if (!list || list.length === 0) {
          setError('No camera found on this device.');
          setStarting(false);
          return;
        }
        setCameras(list);
        // Prefer the back camera on phones — Android usually labels it 'back'/'environment'
        const back = list.find(c => /back|rear|environment/i.test(c.label));
        const id = back?.id || list[0].id;
        setCameraId(id);
      } catch (err) {
        setError(err?.message || 'Camera access denied');
        setStarting(false);
      }
    })();

    return () => { cancelled = true; };
  }, [isOpen]);

  // Start the scanner whenever cameraId changes (initial mount or user-switch).
  useEffect(() => {
    if (!isOpen || !cameraId) return;
    let stopped = false;

    const inst = new Html5Qrcode(containerId, /* verbose */ false);
    scannerRef.current = inst;

    inst
      .start(
        cameraId,
        { fps: 10, qrbox: { width: 240, height: 160 }, aspectRatio: 1.6 },
        (decodedText) => {
          if (stopped) return;
          stopped = true;
          // Stop in the next tick so the success event finishes propagating.
          inst.stop().catch(() => {}).finally(() => onScan?.(decodedText));
        },
        () => { /* per-frame failures are noisy; ignore */ }
      )
      .then(() => setStarting(false))
      .catch((err) => {
        setError(err?.message || 'Could not start camera');
        setStarting(false);
      });

    return () => {
      stopped = true;
      if (inst && inst.isScanning) {
        inst.stop().catch(() => {});
      }
    };
  }, [isOpen, cameraId, onScan]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <HiOutlineCamera className="w-5 h-5 text-brand-500" />
            <h3 className="font-heading font-semibold text-slate-800 dark:text-slate-100">Scan Barcode</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-slate-200">
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {error ? (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          ) : (
            <>
              <div id={containerId} className="w-full rounded-xl overflow-hidden bg-black aspect-[16/10]" />
              {starting && <p className="text-center text-xs text-slate-400">Starting camera…</p>}
              <p className="text-[11px] text-slate-400 text-center">
                Hold the barcode 6-12 inches away. Use the back camera for sharper focus.
              </p>
              {cameras.length > 1 && (
                <div className="flex items-center gap-2">
                  <HiOutlineRefresh className="w-4 h-4 text-slate-400" />
                  <select
                    value={cameraId || ''}
                    onChange={(e) => setCameraId(e.target.value)}
                    className="flex-1 text-xs border border-slate-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 rounded-lg px-2 py-1"
                  >
                    {cameras.map(c => <option key={c.id} value={c.id}>{c.label || c.id}</option>)}
                  </select>
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex justify-end">
          <button onClick={onClose} className="btn-secondary btn-sm">Cancel</button>
        </div>
      </div>
    </div>
  );
}
