import { useState, useEffect } from 'react';
import { settingsAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { PageLoader } from '../components/common';
import toast from 'react-hot-toast';
import {
  HiOutlineOfficeBuilding, HiOutlineReceiptTax, HiOutlinePrinter,
  HiOutlineCog, HiOutlineMoon, HiOutlineSun, HiOutlineStar,
} from 'react-icons/hi';

const tabs = [
  { key: 'business', label: 'Business Profile', icon: HiOutlineOfficeBuilding },
  { key: 'tax', label: 'Tax Config', icon: HiOutlineReceiptTax },
  { key: 'receipt', label: 'Receipt Design', icon: HiOutlinePrinter },
  { key: 'system', label: 'System', icon: HiOutlineCog },
  { key: 'loyalty', label: 'Loyalty', icon: HiOutlineStar },
];

export default function SettingsPage() {
  const { business, dispatch } = useAuth();
  const { isDark, toggle: toggleTheme } = useTheme();
  const darkMode = isDark;
  const [tab, setTab] = useState('business');
  const [settings, setSettings] = useState(null);
  const [businessProfile, setBusinessProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [sRes, bRes] = await Promise.all([settingsAPI.get(), settingsAPI.getProfile()]);
      setSettings(sRes.data.data);
      setBusinessProfile(bRes.data.data);
    } catch { toast.error('Failed to load settings'); }
    finally { setLoading(false); }
  };

  const handleSettingsChange = (field, value) => {
    setSettings(s => {
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        return { ...s, [parent]: { ...s[parent], [child]: value } };
      }
      return { ...s, [field]: value };
    });
  };

  const handleBusinessChange = (field, value) => {
    setBusinessProfile(b => {
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        return { ...b, [parent]: { ...b[parent], [child]: value } };
      }
      return { ...b, [field]: value };
    });
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await settingsAPI.update(settings);
      toast.success('Settings saved');
    } catch { toast.error('Failed'); }
    finally { setSaving(false); }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await settingsAPI.updateProfile(businessProfile);
      dispatch({ type: 'UPDATE_BUSINESS', payload: res.data.data });
      toast.success('Profile saved');
    } catch { toast.error('Failed'); }
    finally { setSaving(false); }
  };

  const toggleDarkMode = () => toggleTheme();

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-5 animate-fade-in">
      <h1 className="text-2xl font-heading font-bold text-slate-800">Settings</h1>

      <div className="flex gap-6">
        {/* Tabs */}
        <div className="w-48 flex-shrink-0 space-y-1 hidden lg:block">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                tab === t.key ? 'bg-brand-50 text-brand-700 border border-brand-200' : 'text-slate-500 hover:bg-slate-100'
              }`}>
              <t.icon className="w-[1.125rem] h-[1.125rem] flex-shrink-0" /> {t.label}
            </button>
          ))}
          <button onClick={toggleDarkMode}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-100 transition-all text-left mt-4">
            {darkMode ? <HiOutlineSun className="w-[1.125rem] h-[1.125rem]" /> : <HiOutlineMoon className="w-[1.125rem] h-[1.125rem]" />}
            {darkMode ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>

        {/* Mobile tabs */}
        <div className="lg:hidden flex gap-1 overflow-x-auto pb-2 w-full">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap ${tab === t.key ? 'bg-brand-500 text-white' : 'bg-white border text-slate-500'}`}>
              <t.icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Business Profile */}
          {tab === 'business' && businessProfile && (
            <div className="card p-6 space-y-5">
              <h2 className="font-heading font-semibold text-lg text-slate-800">Business Profile</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="input-label">Business Name</label><input value={businessProfile.name || ''} onChange={(e) => handleBusinessChange('name', e.target.value)} className="input-field" /></div>
                <div><label className="input-label">Owner Name</label><input value={businessProfile.ownerName || ''} onChange={(e) => handleBusinessChange('ownerName', e.target.value)} className="input-field" /></div>
                <div><label className="input-label">Email</label><input value={businessProfile.email || ''} className="input-field bg-slate-50" disabled /></div>
                <div><label className="input-label">Phone</label><input value={businessProfile.phone || ''} onChange={(e) => handleBusinessChange('phone', e.target.value)} className="input-field" /></div>
                <div><label className="input-label">Tax Number (NTN/GST)</label><input value={businessProfile.taxNumber || ''} onChange={(e) => handleBusinessChange('taxNumber', e.target.value)} className="input-field" /></div>
                <div><label className="input-label">Business Type</label>
                  <select value={businessProfile.businessType || 'retail'} onChange={(e) => handleBusinessChange('businessType', e.target.value)} className="input-field">
                    <option value="retail">Retail</option><option value="wholesale">Wholesale</option><option value="both">Both</option><option value="pharmacy">Pharmacy</option><option value="restaurant">Restaurant</option>
                  </select>
                </div>
                <div><label className="input-label">Currency</label>
                  <select value={businessProfile.currency || 'PKR'} onChange={(e) => handleBusinessChange('currency', e.target.value)} className="input-field">
                    <option value="PKR">PKR (Pakistani Rupee)</option><option value="USD">USD (US Dollar)</option><option value="EUR">EUR (Euro)</option><option value="GBP">GBP (Pound)</option><option value="AED">AED (Dirham)</option><option value="SAR">SAR (Riyal)</option>
                  </select>
                </div>
                <div><label className="input-label">Timezone</label><input value={businessProfile.timezone || 'Asia/Karachi'} onChange={(e) => handleBusinessChange('timezone', e.target.value)} className="input-field" /></div>
                <div><label className="input-label">Website</label><input value={businessProfile.website || ''} onChange={(e) => handleBusinessChange('website', e.target.value)} className="input-field" placeholder="https://..." /></div>
                <div><label className="input-label">Fiscal Year Start Month</label>
                  <select value={businessProfile.fiscalYearStart || 1} onChange={(e) => handleBusinessChange('fiscalYearStart', Number(e.target.value))} className="input-field">
                    {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                      <option key={i} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
              <h3 className="font-heading font-semibold text-slate-700 pt-2">Address</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2"><label className="input-label">Street</label><input value={businessProfile.address?.street || ''} onChange={(e) => handleBusinessChange('address.street', e.target.value)} className="input-field" /></div>
                <div><label className="input-label">City</label><input value={businessProfile.address?.city || ''} onChange={(e) => handleBusinessChange('address.city', e.target.value)} className="input-field" /></div>
                <div><label className="input-label">State</label><input value={businessProfile.address?.state || ''} onChange={(e) => handleBusinessChange('address.state', e.target.value)} className="input-field" /></div>
              </div>
              <div className="flex justify-end pt-3 border-t"><button onClick={saveProfile} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Profile'}</button></div>
            </div>
          )}

          {/* Tax Configuration */}
          {tab === 'tax' && settings && (
            <div className="card p-6 space-y-5">
              <h2 className="font-heading font-semibold text-lg text-slate-800">Tax Configuration</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="input-label">Default Tax Rate (%)</label><input type="number" value={settings.taxRate} onChange={(e) => handleSettingsChange('taxRate', Number(e.target.value))} className="input-field font-mono" min={0} max={100} /></div>
                <div><label className="input-label">Tax Mode</label>
                  <select value={settings.taxInclusive ? 'inclusive' : 'exclusive'} onChange={(e) => handleSettingsChange('taxInclusive', e.target.value === 'inclusive')} className="input-field">
                    <option value="exclusive">Tax Exclusive (add tax on top)</option><option value="inclusive">Tax Inclusive (tax included in price)</option>
                  </select>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-700">
                <p className="font-semibold mb-1">Current Setting:</p>
                <p>Default tax rate is <span className="font-mono font-bold">{settings.taxRate}%</span> ({settings.taxInclusive ? 'included in' : 'added on top of'} product prices). Products can have individual tax rates that override this default.</p>
              </div>
              <div className="flex justify-end pt-3 border-t"><button onClick={saveSettings} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Settings'}</button></div>
            </div>
          )}

          {/* Receipt Design */}
          {tab === 'receipt' && settings && (
            <div className="card p-6 space-y-5">
              <h2 className="font-heading font-semibold text-lg text-slate-800">Receipt & Invoice Design</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-4">
                  <div><label className="input-label">Invoice Prefix</label><input value={settings.invoicePrefix} onChange={(e) => handleSettingsChange('invoicePrefix', e.target.value)} className="input-field font-mono" placeholder="INV" /></div>
                  <div><label className="input-label">PO Prefix</label><input value={settings.poPrefix} onChange={(e) => handleSettingsChange('poPrefix', e.target.value)} className="input-field font-mono" placeholder="PO" /></div>
                  <div><label className="input-label">Header Alignment</label>
                    <select value={settings.receiptDesign?.headerAlignment || 'center'} onChange={(e) => handleSettingsChange('receiptDesign.headerAlignment', e.target.value)} className="input-field">
                      <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
                    </select>
                  </div>
                  <div><label className="input-label">Receipt Width</label>
                    <select value={settings.receiptDesign?.receiptWidth || '80mm'} onChange={(e) => handleSettingsChange('receiptDesign.receiptWidth', e.target.value)} className="input-field">
                      <option value="58mm">58mm (Narrow)</option><option value="80mm">80mm (Standard)</option>
                    </select>
                  </div>
                  <div><label className="input-label">Footer Text</label><textarea value={settings.receiptDesign?.footerText || ''} onChange={(e) => handleSettingsChange('receiptDesign.footerText', e.target.value)} className="input-field" rows={2} placeholder="Thank you for your business!" /></div>
                  <div className="space-y-2">
                    {[
                      { key: 'showLogo', label: 'Show Logo' },
                      { key: 'showTaxDetails', label: 'Show Tax Details' },
                      { key: 'showDiscount', label: 'Show Discount' },
                      { key: 'showBarcode', label: 'Show Barcode' },
                    ].map(opt => (
                      <label key={opt.key} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={settings.receiptDesign?.[opt.key] ?? true}
                          onChange={(e) => handleSettingsChange(`receiptDesign.${opt.key}`, e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500" />
                        <span className="text-sm text-slate-600">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Receipt Preview */}
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 bg-white">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Preview</p>
                  <div className="font-mono text-[10px] leading-relaxed text-slate-700 space-y-1" style={{ textAlign: settings.receiptDesign?.headerAlignment || 'center' }}>
                    {settings.receiptDesign?.showLogo && <p className="text-lg">🏪</p>}
                    <p className="font-bold text-xs">{businessProfile?.name || 'Business Name'}</p>
                    <p>{businessProfile?.address?.street || 'Address'}</p>
                    <p>{businessProfile?.phone || 'Phone'}</p>
                    <div className="border-t border-dashed border-slate-300 my-2" />
                    <div className="text-left">
                      <p>Invoice: <span className="font-bold">{settings.invoicePrefix}-00001</span></p>
                      <p>Date: {new Date().toLocaleDateString()}</p>
                      <div className="border-t border-dashed border-slate-300 my-1" />
                      <p>Sample Product x2   Rs. 1,000</p>
                      <p>Another Item  x1    Rs. 500</p>
                      <div className="border-t border-dashed border-slate-300 my-1" />
                      <p>Subtotal:            Rs. 1,500</p>
                      {settings.receiptDesign?.showTaxDetails && <p>Tax ({settings.taxRate}%):     Rs. {(1500 * settings.taxRate / 100).toFixed(0)}</p>}
                      {settings.receiptDesign?.showDiscount && <p>Discount:            Rs. 0</p>}
                      <p className="font-bold">TOTAL:               Rs. {(1500 + 1500 * settings.taxRate / 100).toFixed(0)}</p>
                      <div className="border-t border-dashed border-slate-300 my-1" />
                    </div>
                    <p className="text-center">{settings.receiptDesign?.footerText || 'Thank you!'}</p>
                    {settings.receiptDesign?.showBarcode && <p className="text-center mt-1">||||||||||||||||||||</p>}
                  </div>
                </div>
              </div>
              <div className="flex justify-end pt-3 border-t"><button onClick={saveSettings} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Settings'}</button></div>
            </div>
          )}

          {/* System Settings */}
          {tab === 'system' && settings && (
            <div className="card p-6 space-y-5">
              <h2 className="font-heading font-semibold text-lg text-slate-800">System Settings</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="input-label">SKU Prefix</label><input value={settings.skuPrefix} onChange={(e) => handleSettingsChange('skuPrefix', e.target.value)} className="input-field font-mono" /></div>
                <div><label className="input-label">Currency Symbol</label><input value={settings.currencySymbol} onChange={(e) => handleSettingsChange('currencySymbol', e.target.value)} className="input-field" /></div>
                <div><label className="input-label">Max Cashier Discount (%)</label><input type="number" value={settings.maxCashierDiscount} onChange={(e) => handleSettingsChange('maxCashierDiscount', Number(e.target.value))} className="input-field" min={0} max={100} /></div>
                <div><label className="input-label">Session Timeout (minutes)</label><input type="number" value={settings.sessionTimeout} onChange={(e) => handleSettingsChange('sessionTimeout', Number(e.target.value))} className="input-field" min={5} /></div>
              </div>
              <div className="space-y-3">
                {[
                  { key: 'autoSku', label: 'Auto-generate SKU for new products' },
                  { key: 'allowNegativeStock', label: 'Allow selling when stock is zero (negative stock)' },
                  { key: 'requireCustomer', label: 'Require customer selection for every sale' },
                ].map(opt => (
                  <label key={opt.key} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                    <input type="checkbox" checked={settings[opt.key] || false}
                      onChange={(e) => handleSettingsChange(opt.key, e.target.checked)}
                      className="w-5 h-5 rounded border-slate-300 text-brand-500 focus:ring-brand-500" />
                    <span className="text-sm text-slate-700">{opt.label}</span>
                  </label>
                ))}
              </div>

              {/* Dark Mode Toggle */}
              <div className="pt-4 border-t border-slate-200">
                <h3 className="font-heading font-semibold text-slate-700 mb-3">Appearance</h3>
                <label className="flex items-center justify-between p-4 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    {darkMode ? <HiOutlineMoon className="w-5 h-5 text-purple-500" /> : <HiOutlineSun className="w-5 h-5 text-amber-500" />}
                    <div>
                      <p className="text-sm font-medium text-slate-700">Dark Mode</p>
                      <p className="text-xs text-slate-400">Toggle between light and dark theme</p>
                    </div>
                  </div>
                  <button onClick={toggleDarkMode}
                    className={`relative w-12 h-6 rounded-full transition-colors ${darkMode ? 'bg-brand-500' : 'bg-slate-300'}`}>
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${darkMode ? 'left-6' : 'left-0.5'}`} />
                  </button>
                </label>
              </div>

              <div className="flex justify-end pt-3 border-t"><button onClick={saveSettings} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Settings'}</button></div>
            </div>
          )}

          {/* Loyalty Settings */}
          {tab === 'loyalty' && settings && (
            <div className="card p-6 space-y-5">
              <h2 className="font-heading font-semibold text-lg text-slate-800">Loyalty Program</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Points per purchase</label>
                  <input type="number" value={settings.loyaltyPointsRate} onChange={(e) => handleSettingsChange('loyaltyPointsRate', Number(e.target.value))} className="input-field" min={0} />
                  <p className="text-xs text-slate-400 mt-1">Points earned per qualifying amount</p>
                </div>
                <div>
                  <label className="input-label">Qualifying amount ({settings.currencySymbol})</label>
                  <input type="number" value={settings.loyaltyPointsValue} onChange={(e) => handleSettingsChange('loyaltyPointsValue', Number(e.target.value))} className="input-field" min={1} />
                  <p className="text-xs text-slate-400 mt-1">Customer earns points for every this amount spent</p>
                </div>
                <div>
                  <label className="input-label">Points Expiry (days)</label>
                  <input type="number" value={settings.loyaltyPointsExpiry} onChange={(e) => handleSettingsChange('loyaltyPointsExpiry', Number(e.target.value))} className="input-field" min={30} />
                </div>
              </div>
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
                <p className="font-semibold mb-1">How it works:</p>
                <p>Customer earns <span className="font-bold">{settings.loyaltyPointsRate}</span> point(s) for every <span className="font-bold">{settings.currencySymbol} {settings.loyaltyPointsValue}</span> spent. Points expire after <span className="font-bold">{settings.loyaltyPointsExpiry}</span> days.</p>
              </div>
              <div className="flex justify-end pt-3 border-t"><button onClick={saveSettings} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Settings'}</button></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
