// D:\gold-centro\app\branch\direct-purchase\new\page.js
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import { 
  CameraIcon, 
  DocumentArrowUpIcon, 
  UserIcon, 
  CubeIcon, 
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import CameraCaptureModal from '../../../components/CameraCaptureModal';

export default function NewDirectPurchase() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [goldRate, setGoldRate] = useState(null);
  
  // Customer Lookup State
  const [lookingUp, setLookingUp] = useState(false);
  const [isExistingCustomer, setIsExistingCustomer] = useState(false);
  const [customerNotFound, setCustomerNotFound] = useState(false);

  // Camera State
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraTarget, setCameraTarget] = useState(null);

  // Customer State
  const [customer, setCustomer] = useState({
    name: '', phone: '', aadhaarNumber: '', panNumber: '', 
    profilePhoto: '', aadhaarFront: '', aadhaarBack: '', panFront: ''
  });
  
  // Item State
  const [items, setItems] = useState([
    { 
      name: 'Bangle', 
      count: 1, 
      purity: '22K', 
      preEstimationGrossWeight: '', 
      ratePerGram: 0,
      itemPrice: 0,
      imageUrls: [] 
    }
  ]);

  const fetchRates = () => {
    fetch('/api/rates/current')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.rate?.rates) {
          setGoldRate(d.rate);
        }
      })
      .catch(() => console.error('Failed to load rates'));
  };

  useEffect(() => {
    fetchRates();
  }, []);

  useEffect(() => {
    if (!goldRate?.rates) return;
    
    setItems(prevItems => prevItems.map(item => {
      const rate = goldRate.rates[item.purity] || 0;
      const preGross = parseFloat(item.preEstimationGrossWeight) || 0;
      
      if (preGross > 0) {
        return {
          ...item,
          ratePerGram: rate,
          itemPrice: (preGross * rate).toFixed(2)
        };
      }
      return item;
    }));
  }, [goldRate]);

  const handlePhoneChange = (e) => {
    const rawPhone = e.target.value.replace(/\D/g, '');
    
    if (rawPhone !== customer.phone) {
      setIsExistingCustomer(false);
      setCustomerNotFound(false);
      setCustomer({
        name: '', phone: rawPhone, aadhaarNumber: '', panNumber: '', 
        profilePhoto: '', aadhaarFront: '', aadhaarBack: '', panFront: ''
      });
    }

    if (rawPhone.length === 10) {
      lookupCustomer(rawPhone);
    }
  };

  const lookupCustomer = async (phone) => {
    setLookingUp(true);
    try {
      const res = await fetch(`/api/branch/customers/lookup?phone=${phone}`);
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Lookup failed');

      if (data.success && data.customer) {
        setIsExistingCustomer(true);
        setCustomer(prev => ({
          ...prev,
          name: data.customer.name || '',
          aadhaarNumber: data.customer.aadhaarNumber || '',
          panNumber: data.customer.panNumber || '',
          profilePhoto: data.customer.profilePhoto || '',
          aadhaarFront: data.customer.aadhaarFront || '',
          aadhaarBack: data.customer.aadhaarBack || '',
          panFront: data.customer.panFront || '',
        }));
        toast.success('Existing customer loaded');
      } else {
        setIsExistingCustomer(false);
        setCustomerNotFound(true);
        setCustomer({
          name: '', phone: phone, aadhaarNumber: '', panNumber: '', 
          profilePhoto: '', aadhaarFront: '', aadhaarBack: '', panFront: ''
        });
      }
    } catch (err) {
      console.error(err);
      toast.error('Lookup error: ' + err.message);
    } finally {
      setLookingUp(false);
    }
  };

  const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Upload failed');
    return data.secure_url;
  };

  const processImageUpload = async (file, target) => {
    const t = toast.loading('Uploading image...');
    try {
      const url = await uploadImage(file);
      if (target?.type === 'customer') {
        setCustomer(p => ({ ...p, [target.field]: url }));
      } else if (target?.type === 'item') {
        const newItems = [...items];
        newItems[target.index].imageUrls.push(url);
        setItems(newItems);
      }
      toast.success('Image added', { id: t });
    } catch (err) {
      toast.error(err.message, { id: t });
    }
  };

  const handleFileUpload = (e, type, field, index) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processImageUpload(file, { type, field, index });
  };

  const openCamera = (type, field, index) => {
    setCameraTarget({ type, field, index });
    setCameraOpen(true);
  };

  const handleCameraCapture = async (file) => {
    if (cameraTarget) {
      await processImageUpload(file, cameraTarget);
    }
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;

    if (['preEstimationGrossWeight', 'purity'].includes(field)) {
      const preGross = parseFloat(newItems[index].preEstimationGrossWeight) || 0;
      const purity = newItems[index].purity || '22K';
      const rate = goldRate?.rates?.[purity] || 0;
      
      newItems[index].ratePerGram = rate;
      newItems[index].itemPrice = (preGross * rate).toFixed(2);
    }
    
    setItems(newItems);
  };

  const handleSubmit = async () => {
    if (!customer.name.trim() || !customer.phone) {
      return toast.error('Customer name and phone are required');
    }
    if (!/^\d{10}$/.test(customer.phone)) {
      return toast.error('Phone number must be exactly 10 digits');
    }
    if (customer.aadhaarNumber && !/^\d{12}$/.test(customer.aadhaarNumber)) {
      return toast.error('Aadhaar number must be exactly 12 digits');
    }
    if (customer.panNumber) {
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (!panRegex.test(customer.panNumber)) {
        return toast.error('Invalid PAN format. Expected: ABCDE1234F');
      }
    }
    if (items.some(i => !i.preEstimationGrossWeight || parseFloat(i.preEstimationGrossWeight) <= 0)) {
      return toast.error('Please enter a valid pre-estimation weight for all items');
    }
    
    setLoading(true);
    try {
      const res = await fetch('/api/branch/direct-purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: user.branchId,
          staffId: user.id,
          customer,
          items,
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      toast.success('Order created. Proceeding to Estimate Agreement...');
      router.push(`/branch/direct-purchase/${data.order.id}/estimate-agreement`);
      
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Updated Image Component for clean look
  const ImageCaptureSlot = ({ label, url, onCamera, onUpload }) => (
    <div className="flex flex-col items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
      <div className="w-full h-24 bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center overflow-hidden mb-3 relative">
        {url ? (
          <img src={url} className="w-full h-full object-cover" />
        ) : (
          <CameraIcon className="w-8 h-8 text-slate-300" />
        )}
      </div>
      <p className="text-[11px] text-slate-600 font-medium mb-2 uppercase tracking-wide">{label}</p>
      <div className="flex gap-2 w-full">
        <button onClick={onCamera} type="button" className="flex-1 bg-slate-100 text-slate-700 text-[11px] py-1.5 rounded-md font-medium hover:bg-slate-200 transition-colors flex items-center justify-center gap-1.5">
          <CameraIcon className="w-3.5 h-3.5" /> Snap
        </button>
        <label className="flex-1 bg-slate-100 text-slate-700 text-[11px] py-1.5 rounded-md font-medium hover:bg-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer">
          <DocumentArrowUpIcon className="w-3.5 h-3.5" /> File
          <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
        </label>
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 p-4">
      <Toaster position="top-center" />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Direct Branch Purchase</h1>
          <p className="text-sm text-slate-500 mt-1">Create a new buy-back order from a customer.</p>
        </div>
        {goldRate && (
          <div className="flex items-center gap-3 text-sm bg-slate-50 px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
            <span className="text-slate-500 font-medium">Live Rate:</span>
            <span className="font-bold text-slate-900">22K: ₹{goldRate.rates['22K']}</span>
            <span className="text-slate-300">|</span>
            <span className="font-bold text-slate-900">24K: ₹{goldRate.rates['24K']}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-6 -mb-px">
          {['Customer Details', 'Pre-Estimation'].map((label, idx) => (
            <button 
              key={label} 
              onClick={() => setStep(idx + 1)} 
              className={`font-medium text-sm pb-3 border-b-2 transition-colors flex items-center gap-2 ${
                step === idx + 1 
                  ? 'border-slate-900 text-slate-900' 
                  : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                step === idx + 1 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {idx + 1}
              </span>
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* STEP 1: CUSTOMER */}
      {step === 1 && (
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 space-y-6">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-4">
            <UserIcon className="w-5 h-5 text-slate-400"/> Customer Details
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="relative">
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Phone Number <span className="text-red-500">*</span></label>
              <input 
                type="tel" 
                placeholder="10 digit mobile number" 
                value={customer.phone} 
                onChange={handlePhoneChange}
                maxLength={10}
                className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all text-sm" 
              />
              {lookingUp && (
                <div className="absolute right-3 top-[34px] w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
              )}
            </div>
            
            <div className="relative">
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Full Name <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                placeholder="Customer name" 
                value={customer.name} 
                onChange={e => setCustomer({...customer, name: e.target.value})} 
                className={`w-full border p-2.5 rounded-lg outline-none transition-all text-sm ${isExistingCustomer ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-300 focus:ring-2 focus:ring-slate-900 focus:border-slate-900'}`} 
              />
              
              {isExistingCustomer && (
                <span className="absolute -top-2.5 right-3 bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 border border-emerald-200 shadow-sm">
                  <CheckCircleIcon className="w-3 h-3" /> Existing
                </span>
              )}
              {customerNotFound && (
                <span className="absolute -top-2.5 right-3 bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 border border-amber-200 shadow-sm">
                  <ExclamationCircleIcon className="w-3 h-3" /> New Profile
                </span>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Aadhaar Number</label>
              <input 
                type="text" 
                placeholder="12 digit Aadhaar" 
                value={customer.aadhaarNumber} 
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 12);
                  setCustomer({...customer, aadhaarNumber: val});
                }} 
                maxLength={12}
                className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all text-sm" 
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">PAN Number</label>
              <input 
                type="text" 
                placeholder="e.g. ABCDE1234F" 
                value={customer.panNumber} 
                onChange={e => {
                  const val = e.target.value.toUpperCase().slice(0, 10);
                  setCustomer({...customer, panNumber: val});
                }} 
                maxLength={10}
                className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all text-sm uppercase" 
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <label className="block text-xs font-medium text-slate-700 mb-3">KYC Documents</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {['profilePhoto', 'aadhaarFront', 'aadhaarBack', 'panFront'].map(field => (
                <ImageCaptureSlot
                  key={field}
                  label={field.replace(/([A-Z])/g, ' $1').trim()}
                  url={customer[field]}
                  onCamera={() => openCamera('customer', field)}
                  onUpload={(e) => handleFileUpload(e, 'customer', field)}
                />
              ))}
            </div>
          </div>
          
          <div className="pt-4 flex justify-end">
            <button 
              onClick={() => setStep(2)} 
              className="bg-slate-900 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors flex items-center gap-2"
            >
              Next: Pre-Estimation <ArrowRightIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: PRE-ESTIMATION */}
      {step === 2 && (
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <CubeIcon className="w-5 h-5 text-slate-400"/> Pre-Estimation (Before Melting)
            </h2>
            <p className="text-sm text-slate-500 mt-1">Record the items exactly as the customer brings them in. Final valuation will happen post-cleaning.</p>
          </div>
          
          <div className="space-y-5">
            {items.map((item, idx) => (
              <div key={idx} className="border border-slate-200 p-5 rounded-xl space-y-4 bg-slate-50/50 relative">
                <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                  <h3 className="font-semibold text-sm text-slate-800 flex items-center gap-2">
                    <span className="bg-slate-200 text-slate-600 w-6 h-6 rounded-md flex items-center justify-center text-xs">{idx + 1}</span> 
                    Item Details
                  </h3>
                  {items.length > 1 && (
                    <button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-red-500 text-xs font-medium hover:text-red-700 flex items-center gap-1">
                      <XMarkIcon className="w-3.5 h-3.5" /> Remove
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Item Name</label>
                    <input type="text" placeholder="e.g. Chain, Bangle" value={item.name} onChange={e => updateItem(idx, 'name', e.target.value)} className="w-full border border-slate-300 p-2 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Count (Pieces)</label>
                    <input type="number" value={item.count} onChange={e => updateItem(idx, 'count', e.target.value)} className="w-full border border-slate-300 p-2 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Purity</label>
                    <select value={item.purity} onChange={e => updateItem(idx, 'purity', e.target.value)} className="w-full border border-slate-300 p-2 rounded-lg text-sm font-medium focus:ring-2 focus:ring-slate-900 outline-none bg-white">
                      <option value="24K">24K</option>
                      <option value="22K">22K</option>
                      <option value="18K">18K</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end bg-white p-3 rounded-lg border border-slate-200">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Pre-Gross Weight (g) <span className="text-red-500">*</span></label>
                    <input type="number" step="0.01" placeholder="0.00" value={item.preEstimationGrossWeight} onChange={e => updateItem(idx, 'preEstimationGrossWeight', e.target.value)} className="w-full border border-slate-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none font-medium" />
                  </div>
                  
                  {parseFloat(item.itemPrice) > 0 && (
                    <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg flex justify-between items-center">
                      <span className="text-[11px] text-slate-500 font-medium uppercase tracking-wide">Est. Value</span>
                      <span className="font-bold text-slate-900 text-base">₹ {item.itemPrice}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <p className="text-[11px] font-medium text-slate-600 mb-2">Item Photos ({item.imageUrls.length})</p>
                  <div className="flex flex-wrap gap-3">
                    {item.imageUrls.map((url, i) => (
                      <div key={i} className="w-14 h-14 rounded-lg border border-slate-200 overflow-hidden relative group">
                        <img src={url} className="w-full h-full object-cover" />
                        <button onClick={() => {
                          const newItems = [...items];
                          newItems[idx].imageUrls = newItems[idx].imageUrls.filter((_, idx2) => idx2 !== i);
                          setItems(newItems);
                        }} className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <XMarkIcon className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                    
                    <button onClick={() => openCamera('item', null, idx)} type="button" className="w-14 h-14 border border-slate-300 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors bg-white">
                      <CameraIcon className="w-6 h-6" />
                    </button>
                    <label className="w-14 h-14 border border-slate-300 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer bg-white">
                      <DocumentArrowUpIcon className="w-6 h-6" />
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'item', null, idx)} />
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button 
            onClick={() => setItems([...items, { name: 'Ring', count: 1, purity: '22K', preEstimationGrossWeight: '', ratePerGram: 0, itemPrice: 0, imageUrls: [] }])} 
            className="w-full border-2 border-dashed border-slate-300 text-slate-600 text-sm font-medium py-3 rounded-xl hover:bg-slate-50 hover:border-slate-400 transition-colors flex items-center justify-center gap-2"
          >
            + Add Another Item
          </button>
          
          <div className="flex gap-4 pt-6 border-t border-slate-100">
            <button 
              onClick={() => setStep(1)} 
              className="flex-1 bg-white border border-slate-300 text-slate-700 px-6 py-3 rounded-lg font-medium hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeftIcon className="w-4 h-4" /> Back
            </button>
            <button 
              onClick={handleSubmit} 
              disabled={loading} 
              className="flex-[2] bg-emerald-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              {loading ? 'Generating...' : 'Generate Estimate Agreement'}
            </button>
          </div>
        </div>
      )}

      <CameraCaptureModal isOpen={cameraOpen} onClose={() => setCameraOpen(false)} onCapture={handleCameraCapture} />
    </div>
  );
}