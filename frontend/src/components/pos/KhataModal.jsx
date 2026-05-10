import { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { uploadAPI } from '../../utils/api';
import { formatCurrency } from '../../utils/format';
import {
  HiOutlineX, HiOutlineUser, HiOutlineUsers, HiOutlineCamera,
  HiOutlineMicrophone, HiOutlineStop, HiOutlinePlay, HiOutlineTrash,
  HiOutlineCheck, HiOutlineCloudUpload,
} from 'react-icons/hi';

// Client-side image compression — same approach as the avatar upload.
// Resize to max 1280px on the long edge, JPEG @ 0.8. Keeps proofs under ~200KB.
async function compressImage(file, maxDim = 1280, quality = 0.8) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const img = await new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = dataUrl;
  });
  const ratio = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  canvas.getContext('2d').drawImage(img, 0, 0, w, h);
  const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', quality));
  return new File([blob], (file.name || 'proof').replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
}

export default function KhataModal({ isOpen, onClose, onConfirm, customer, amount, paidNow = 0, grandTotal = 0 }) {
  const [type, setType] = useState('self');
  const [proxyName, setProxyName] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [voiceUrl, setVoiceUrl] = useState('');
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordedUrl, setRecordedUrl] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [uploading, setUploading] = useState(false);
  const mediaRecRef = useRef(null);
  const tickRef = useRef(null);
  const fileRef = useRef(null);

  // Reset state every time the modal re-opens.
  useEffect(() => {
    if (!isOpen) return;
    setType('self'); setProxyName(''); setImageFile(null); setImagePreview('');
    setImageUrl(''); setVoiceUrl(''); setRecording(false);
    setRecordedBlob(null); setRecordedUrl(''); setElapsed(0); setUploading(false);
  }, [isOpen]);

  // Cleanup any object URLs we created for previews.
  useEffect(() => () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
  }, [imagePreview, recordedUrl]);

  const pickImage = async (file) => {
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setImageFile(compressed);
      const url = URL.createObjectURL(compressed);
      setImagePreview(url);
      setImageUrl(''); // force re-upload on next confirm
    } catch (e) {
      toast.error('Could not process image');
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const chunks = [];
      mr.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunks, { type: chunks[0]?.type || 'audio/webm' });
        setRecordedBlob(blob);
        setRecordedUrl(URL.createObjectURL(blob));
        setVoiceUrl('');
        // Stop the mic immediately to drop the red recording indicator in the tab.
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      mediaRecRef.current = mr;
      setRecording(true);
      setElapsed(0);
      tickRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    } catch (e) {
      toast.error('Microphone permission denied');
    }
  };

  const stopRecording = () => {
    mediaRecRef.current?.stop();
    setRecording(false);
    clearInterval(tickRef.current);
  };

  const removeRecording = () => {
    setRecordedBlob(null);
    if (recordedUrl) { URL.revokeObjectURL(recordedUrl); setRecordedUrl(''); }
    setVoiceUrl('');
    setElapsed(0);
  };

  const removeImage = () => {
    setImageFile(null);
    if (imagePreview) { URL.revokeObjectURL(imagePreview); setImagePreview(''); }
    setImageUrl('');
  };

  const handleConfirm = async () => {
    if (type === 'someone_else') {
      if (!imageFile && !imageUrl && !recordedBlob && !voiceUrl) {
        return toast.error('Add at least one proof — photo or voice note');
      }
    }

    setUploading(true);
    try {
      let finalImageUrl = imageUrl;
      let finalVoiceUrl = voiceUrl;

      if (type === 'someone_else') {
        if (imageFile && !imageUrl) {
          const res = await uploadAPI.khataImage(imageFile);
          finalImageUrl = res.data?.data?.url || '';
          setImageUrl(finalImageUrl);
        }
        if (recordedBlob && !voiceUrl) {
          const file = new File([recordedBlob], `voice-${Date.now()}.webm`, { type: recordedBlob.type });
          const res = await uploadAPI.khataVoice(file);
          finalVoiceUrl = res.data?.data?.url || '';
          setVoiceUrl(finalVoiceUrl);
        }
      }

      onConfirm({
        udharType: type,
        udharProxyName: type === 'someone_else' ? proxyName.trim() : '',
        udharProofImage: finalImageUrl || '',
        udharProofVoice: finalVoiceUrl || '',
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload proof');
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
          <div>
            <h3 className="font-heading font-semibold text-slate-800 dark:text-slate-100">Khata (Udhar) Entry</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {customer?.customerName || 'Walk-in'} · Khata amount: <span className="font-mono font-semibold text-amber-600">{formatCurrency(amount || 0)}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-slate-200">
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>

        {/* Partial-payment breakdown — only shown when the customer paid something now */}
        {paidNow > 0 && (
          <div className="px-5 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-200 dark:border-emerald-700 text-xs flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-300">Bill: <span className="font-mono font-semibold">{formatCurrency(grandTotal)}</span></span>
            <span className="text-emerald-700 dark:text-emerald-300">Paid now: <span className="font-mono font-semibold">{formatCurrency(paidNow)}</span></span>
            <span className="text-amber-700 dark:text-amber-300">On khata: <span className="font-mono font-bold">{formatCurrency(amount)}</span></span>
          </div>
        )}

        <div className="p-5 space-y-4">
          {/* Self / Someone-Else toggle */}
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Who is taking the udhar?</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('self')}
                className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                  type === 'self'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-300'
                }`}
              >
                <HiOutlineUser className="w-5 h-5" />
                <span className="text-sm font-semibold">Self</span>
                <span className="text-[10px] text-center leading-tight opacity-75">Customer is here in person</span>
              </button>
              <button
                type="button"
                onClick={() => setType('someone_else')}
                className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                  type === 'someone_else'
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
                    : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-300'
                }`}
              >
                <HiOutlineUsers className="w-5 h-5" />
                <span className="text-sm font-semibold">Someone Else</span>
                <span className="text-[10px] text-center leading-tight opacity-75">Proxy / family member</span>
              </button>
            </div>
          </div>

          {/* Proof inputs only when "someone else" */}
          {type === 'someone_else' && (
            <>
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Proxy name (optional)</label>
                <input
                  value={proxyName}
                  onChange={(e) => setProxyName(e.target.value)}
                  placeholder="e.g. Bilal (son)"
                  className="input-field mt-1"
                />
              </div>

              {/* Image proof */}
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Photo proof</p>
                {imagePreview ? (
                  <div className="relative inline-block">
                    <img src={imagePreview} alt="Proof" className="w-full max-h-48 rounded-xl object-cover border border-slate-200 dark:border-slate-600" />
                    <button onClick={removeImage} className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-red-500">
                      <HiOutlineTrash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileRef.current?.click()}
                    type="button"
                    className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-600 hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <HiOutlineCamera className="w-5 h-5 text-brand-500" />
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Take / choose photo</span>
                  </button>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => pickImage(e.target.files?.[0])}
                />
              </div>

              {/* Voice proof */}
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Voice note</p>
                {recordedUrl ? (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
                    <HiOutlinePlay className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <audio src={recordedUrl} controls className="flex-1 min-w-0" />
                    <button onClick={removeRecording} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500">
                      <HiOutlineTrash className="w-4 h-4" />
                    </button>
                  </div>
                ) : recording ? (
                  <button
                    onClick={stopRecording}
                    type="button"
                    className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-red-300 bg-red-50 text-red-700 transition-colors"
                  >
                    <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                    <HiOutlineStop className="w-5 h-5" />
                    <span className="text-sm font-medium">Stop · {String(Math.floor(elapsed/60)).padStart(2,'0')}:{String(elapsed%60).padStart(2,'0')}</span>
                  </button>
                ) : (
                  <button
                    onClick={startRecording}
                    type="button"
                    className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-600 hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <HiOutlineMicrophone className="w-5 h-5 text-brand-500" />
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Record voice note</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-2 bg-slate-50 dark:bg-slate-700/40 sticky bottom-0">
          <button onClick={onClose} className="btn-secondary btn-sm">Cancel</button>
          <button
            onClick={handleConfirm}
            disabled={uploading}
            className="btn-primary btn-sm flex items-center gap-1.5"
          >
            {uploading ? (
              <><HiOutlineCloudUpload className="w-4 h-4 animate-pulse" /> Uploading…</>
            ) : (
              <><HiOutlineCheck className="w-4 h-4" /> Save & Complete</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
