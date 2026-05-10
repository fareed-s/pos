import { useState, useRef } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { productAPI } from '../../utils/api';
import {
  HiOutlineX, HiOutlineUpload, HiOutlineDownload,
  HiOutlineCheck, HiOutlineExclamationCircle, HiOutlineDocumentText,
  HiOutlineTable,
} from 'react-icons/hi';

// Both XLSX (Excel) and CSV are accepted. The backend doesn't care which one
// the user uploaded — both end up as `[{name, category, price, ...}]` after parsing.
const TEMPLATE_HEADERS = ['name', 'category', 'price', 'quantity', 'barcode', 'description', 'brand', 'expiry_date', 'sku', 'costPrice', 'unit', 'tax', 'lowStockThreshold'];
const TEMPLATE_SAMPLES = [
  ['Lays Salted 60g', 'Snacks', 50, 120, '8964000123456', 'Salted potato chips', 'Lays', '', '', 38, 'piece', 0, 10],
  ["Olper's Milk 1L", 'Dairy', 320, 40, '', 'Full cream milk', 'Olpers', '2026-12-31', '', 270, 'liter', 0, 6],
  ['Brown Bread', 'Bakery', 180, 15, '', '', 'Bake Parlour', '', '', 110, 'piece', 0, 4],
];

const REQUIRED = ['name', 'category', 'price', 'quantity'];

export default function ProductBulkUpload({ isOpen, onClose, onSuccess }) {
  const fileRef = useRef(null);
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [parseErrors, setParseErrors] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [resultSummary, setResultSummary] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  if (!isOpen) return null;

  // ─── Template downloads ─────────────────────────────────────────────────────
  const downloadExcel = () => {
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, ...TEMPLATE_SAMPLES]);
    // Column widths so Excel doesn't collapse the headers.
    ws['!cols'] = TEMPLATE_HEADERS.map(h => ({ wch: Math.max(h.length + 2, 14) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    XLSX.writeFile(wb, 'product-import-template.xlsx');
  };

  const downloadCsv = () => {
    const escape = (c) => /[",\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : String(c);
    const csv = [TEMPLATE_HEADERS, ...TEMPLATE_SAMPLES]
      .map(r => r.map(escape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'product-import-template.csv';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  // ─── File parsing ───────────────────────────────────────────────────────────
  const validateRows = (raw) => {
    const errs = [];
    const parsed = (raw || []).map((r, i) => {
      const lineNo = i + 2; // +1 header, +1 zero-index
      // Coerce all keys to lower-case so 'Name' / 'NAME' / 'name' all work.
      const row = Object.fromEntries(
        Object.entries(r).map(([k, v]) => [String(k).trim(), v])
      );
      const missing = REQUIRED.filter(k => !String(row[k] ?? '').trim());
      const valid = missing.length === 0;
      if (!valid) errs.push({ lineNo, error: `Missing: ${missing.join(', ')}` });
      return { ...row, _lineNo: lineNo, _valid: valid, _missing: missing };
    });
    setRows(parsed);
    setParseErrors(errs);
    if (parsed.length === 0) toast.error('File is empty');
    else toast.success(`Parsed ${parsed.length} row${parsed.length === 1 ? '' : 's'}`);
  };

  const parseExcel = async (file) => {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array', cellDates: true });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) return toast.error('No sheets found in Excel file');
    const sheet = wb.Sheets[sheetName];
    // raw:false → numbers/dates come back as readable strings; defval:'' → empty cells filled
    const raw = XLSX.utils.sheet_to_json(sheet, { raw: false, defval: '' });
    validateRows(raw);
  };

  const parseCsv = (file) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (out) => validateRows(out.data),
      error: (err) => toast.error(`Parse error: ${err.message}`),
    });
  };

  const handleFile = (file) => {
    if (!file) return;
    setFileName(file.name);
    setParseErrors([]);
    setResultSummary(null);

    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (ext === 'xlsx' || ext === 'xls') return parseExcel(file);
    if (ext === 'csv') return parseCsv(file);
    return toast.error('Only .xlsx, .xls or .csv files are supported');
  };

  // ─── Drag-and-drop ──────────────────────────────────────────────────────────
  const onDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const onDragLeave = () => setDragOver(false);
  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  // ─── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const validRows = rows.filter(r => r._valid).map(({ _lineNo, _valid, _missing, ...rest }) => rest);
    if (validRows.length === 0) return toast.error('No valid rows to import');

    setSubmitting(true);
    try {
      const res = await productAPI.bulkCreate(validRows);
      const data = res.data?.data;
      setResultSummary(data);
      toast.success(`Imported ${data.created} of ${data.total}`);
      const failed = (data.results || []).filter(r => !r.ok).length;
      if (failed === 0) {
        setTimeout(() => onSuccess?.(), 600);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bulk import failed');
    } finally {
      setSubmitting(false);
    }
  };

  const validCount = rows.filter(r => r._valid).length;
  const invalidCount = rows.length - validCount;
  const reset = () => {
    setRows([]); setFileName(''); setParseErrors([]); setResultSummary(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h3 className="font-heading font-semibold text-slate-800 dark:text-slate-100">Bulk Upload Products</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Excel (.xlsx) ya CSV file dono kaam karte hain
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-slate-200">
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Step-by-step instructions — always visible so the user knows the flow. */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Step
              n="1"
              title="Template download karo"
              desc="Excel mein open hoga, sample 3 rows aur columns ke saath."
              accent="amber"
            />
            <Step
              n="2"
              title="Excel mein bharo"
              desc="Apne products ki rows likho — name, category, price, quantity ZAROORI hain."
              accent="blue"
            />
            <Step
              n="3"
              title="File yahan upload karo"
              desc=".xlsx ya .csv jo bhi save karo, neeche choose / drop kar do."
              accent="emerald"
            />
          </div>

          {/* Step 1 — Template download buttons (Excel default, CSV also offered) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={downloadExcel}
              className="flex items-center gap-3 p-3 rounded-xl border-2 border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 hover:border-emerald-400 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0">
                <HiOutlineTable className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-100">Download Excel template</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Recommended · .xlsx</p>
              </div>
            </button>
            <button
              onClick={downloadCsv}
              className="flex items-center gap-3 p-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-slate-700 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-slate-400 dark:bg-slate-600 flex items-center justify-center flex-shrink-0">
                <HiOutlineDownload className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-100">Download CSV template</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">.csv (text format)</p>
              </div>
            </button>
          </div>

          {/* Step 3 — File picker / drop zone */}
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className={`cursor-pointer rounded-xl border-2 border-dashed transition-colors p-6 text-center ${
              dragOver
                ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                : fileName
                  ? 'border-emerald-400 bg-emerald-50/40 dark:bg-emerald-900/10'
                  : 'border-slate-300 dark:border-slate-600 hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-slate-700'
            }`}
          >
            <HiOutlineUpload className={`w-9 h-9 mx-auto mb-2 ${fileName ? 'text-emerald-500' : 'text-brand-500'}`} />
            {fileName ? (
              <>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-100">{fileName}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Click ya drag karke change karo · {rows.length} row{rows.length === 1 ? '' : 's'} parsed
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-100">
                  Click to choose file <span className="text-slate-400 font-normal">or drag &amp; drop</span>
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Supports .xlsx, .xls, .csv · up to 1000 rows
                </p>
              </>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              className="hidden"
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>

          {/* Stats strip */}
          {rows.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-700 dark:text-slate-200 font-medium">{rows.length} parsed</span>
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 font-semibold">{validCount} valid</span>
              {invalidCount > 0 && (
                <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 font-semibold">{invalidCount} need fixing</span>
              )}
              <button onClick={reset} className="ml-auto text-[11px] text-slate-400 hover:text-red-500">Clear &amp; start over</button>
            </div>
          )}

          {/* Preview table */}
          {rows.length > 0 && (
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <div className="overflow-auto max-h-72">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-700 sticky top-0">
                    <tr className="text-slate-500 dark:text-slate-300">
                      <th className="px-2 py-2 text-left">Row</th>
                      <th className="px-2 py-2 text-left">Status</th>
                      <th className="px-2 py-2 text-left">Name</th>
                      <th className="px-2 py-2 text-left">Category</th>
                      <th className="px-2 py-2 text-right">Price</th>
                      <th className="px-2 py-2 text-right">Qty</th>
                      <th className="px-2 py-2 text-left">Barcode</th>
                      <th className="px-2 py-2 text-left">Brand</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r._lineNo} className={`border-t border-slate-100 dark:border-slate-700 ${r._valid ? '' : 'bg-red-50/40 dark:bg-red-900/10'}`}>
                        <td className="px-2 py-1 font-mono text-slate-400">{r._lineNo}</td>
                        <td className="px-2 py-1">
                          {r._valid ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                              <HiOutlineCheck className="w-3.5 h-3.5" /> ok
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-600 font-medium" title={r._missing.join(', ')}>
                              <HiOutlineExclamationCircle className="w-3.5 h-3.5" /> miss: {r._missing.join(',')}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-1 dark:text-slate-200">{r.name}</td>
                        <td className="px-2 py-1 dark:text-slate-200">{r.category}</td>
                        <td className="px-2 py-1 text-right font-mono dark:text-slate-200">{r.price}</td>
                        <td className="px-2 py-1 text-right font-mono dark:text-slate-200">{r.quantity}</td>
                        <td className="px-2 py-1 font-mono text-slate-500">{r.barcode || '-'}</td>
                        <td className="px-2 py-1 text-slate-500">{r.brand || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Server response */}
          {resultSummary && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                Imported {resultSummary.created} / {resultSummary.total}
              </p>
              <div className="max-h-40 overflow-auto text-[11px] space-y-0.5">
                {(resultSummary.results || []).filter(r => !r.ok).slice(0, 50).map((r, i) => (
                  <div key={i} className="text-red-600">
                    Row {r.lineNo}: {r.error}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state — only when nothing loaded yet */}
          {rows.length === 0 && !resultSummary && (
            <div className="text-center py-2 text-slate-400 text-xs flex items-center justify-center gap-1">
              <HiOutlineDocumentText className="w-4 h-4" />
              Required columns: <span className="font-mono text-slate-500">{REQUIRED.join(', ')}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-2 bg-slate-50 dark:bg-slate-700/40">
          <button onClick={onClose} className="btn-secondary btn-sm">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={validCount === 0 || submitting}
            className="btn-primary btn-sm flex items-center gap-1.5"
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <><HiOutlineUpload className="w-4 h-4" /> Import {validCount > 0 ? validCount : ''}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Numbered step pill — used at the top of the modal so the user reads the
// flow before scanning the buttons below.
function Step({ n, title, desc, accent }) {
  const accents = {
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  };
  return (
    <div className="flex gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${accents[accent]}`}>
        {n}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight">{title}</p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{desc}</p>
      </div>
    </div>
  );
}
