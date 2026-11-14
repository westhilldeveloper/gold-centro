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
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import CameraCaptureModal from '../../../components/CameraCaptureModal';

export default function NewDirectPurchase() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [step, setStep] = useState(1); // 1: Customer, 2: Pre-Estimation
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
  
  // Item State (Only Pre-Estimation fields now)
  // Added ratePerGram and itemPrice to initial state
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

  // EDGE CASE FIX: If rates load AFTER the user has typed a weight, recalculate.
  useEffect(() => {
    if (!goldRate?.rates) return;
    
    setItems(prevItems => prevItems.map(item => {
      const rate = goldRate.rates[item.purity] || 0;
      const preGross = parseFloat(item.preEstimationGrossWeight) || 0;
      
      // Only update if there is a weight entered
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
    
    setCustomer({ ...customer, phone: rawPhone });
    setIsExistingCustomer(false);
    setCustomerNotFound(false);

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
        toast.success('Existing customer details loaded');
      } else {
        setCustomerNotFound(true);
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

    // Auto-calculate Estimated Price based on Pre-Gross Weight and Live Rate
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
    if (!customer.name || !customer.phone) return toast.error('Customer details required');
    if (items.some(i => !i.preEstimationGrossWeight)) return toast.error('Please enter pre-estimation weights for all items');
    
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

  const ImageCaptureSlot = ({ label, url, onCamera, onUpload }) => (
    <div className="flex flex-col items-center bg-gray-50 p-2 rounded-xl border border-gray-200">
      <div className="w-full h-24 bg-white border-2 border-dashed rounded-lg flex items-center justify-center overflow-hidden mb-2 relative group">
        {url ? (
          <img src={url} className="w-full h-full object-cover" />
        ) : (
          <CameraIcon className="w-8 h-8 text-gray-300" />
        )}
      </div>
      <p className="text-[10px] text-gray-500 font-medium mb-1 uppercase tracking-wider">{label}</p>
      <div className="flex gap-1 w-full">
        <button onClick={onCamera} type="button" className="flex-1 bg-yellow-100 text-yellow-800 text-[10px] py-1 rounded font-bold hover:bg-yellow-200 flex items-center justify-center gap-1">
          <CameraIcon className="w-3 h-3" /> Snap
        </button>
        <label className="flex-1 bg-gray-200 text-gray-700 text-[10px] py-1 rounded font-bold hover:bg-gray-300 flex items-center justify-center gap-1 cursor-pointer">
          <DocumentArrowUpIcon className="w-3 h-3" /> File
          <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
        </label>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 p-4">
      <Toaster position="top-center" />
      <div className="flex justify-between items-center">
        <h1 className="text-2xl md:text-3xl font-bold">Direct Branch Purchase</h1>
        {goldRate && (
          <div className="hidden sm:flex items-center gap-2 text-sm bg-yellow-50 px-3 py-1.5 rounded-lg border border-yellow-200">
            <span className="text-gray-500">Live Rate:</span>
            <span className="font-bold text-yellow-800">22K: ₹{goldRate.rates['22K']}</span>
            <span className="text-gray-300">|</span>
            <span className="font-bold text-yellow-800">24K: ₹{goldRate.rates['24K']}</span>
          </div>
        )}
      </div>

      {/* 2-Step Tabs */}
      <div className="flex gap-4 border-b pb-2">
        {['Customer Details', 'Pre-Estimation'].map((label, idx) => (
          <button key={label} onClick={() => setStep(idx + 1)} className={`font-semibold pb-2 ${step === idx + 1 ? 'text-yellow-600 border-b-2 border-yellow-500' : 'text-gray-400'}`}>
            {idx + 1}. {label}
          </button>
        ))}
      </div>

      {/* STEP 1: CUSTOMER */}
      {step === 1 && (
        <div className="bg-white p-4 md:p-6 rounded-2xl shadow-md space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2"><UserIcon className="w-5 h-5"/> Customer Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <input 
                type="tel" 
                placeholder="Phone Number (10 digits) *" 
                value={customer.phone} 
                onChange={handlePhoneChange}
                maxLength={10}
                className="border p-2 rounded-lg w-full" 
              />
              {lookingUp && (
                <div className="absolute right-3 top-3 w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
              )}
            </div>
            
            <div className="relative">
              <input 
                type="text" 
                placeholder="Full Name *" 
                value={customer.name} 
                onChange={e => setCustomer({...customer, name: e.target.value})} 
                className={`border p-2 rounded-lg w-full ${isExistingCustomer ? 'bg-green-50' : ''}`} 
              />
              
              {isExistingCustomer && (
                <span className="absolute -top-2 -right-2 bg-green-100 text-green-700 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm border border-green-200">
                  <CheckCircleIcon className="w-3 h-3" /> Existing
                </span>
              )}
              {customerNotFound && (
                <span className="absolute -top-2 -right-2 bg-amber-100 text-amber-700 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm border border-amber-200">
                  <ExclamationCircleIcon className="w-3 h-3" /> New
                </span>
              )}
            </div>

            <input type="text" placeholder="Aadhaar Number" value={customer.aadhaarNumber} onChange={e => setCustomer({...customer, aadhaarNumber: e.target.value})} className="border p-2 rounded-lg" />
            <input type="text" placeholder="PAN Number" value={customer.panNumber} onChange={e => setCustomer({...customer, panNumber: e.target.value})} className="border p-2 rounded-lg" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
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
          <button onClick={() => setStep(2)} className="bg-yellow-500 px-6 py-2.5 rounded-lg font-bold w-full mt-4">Next: Pre-Estimation</button>
        </div>
      )}

      {/* STEP 2: PRE-ESTIMATION */}
      {step === 2 && (
        <div className="bg-white p-4 md:p-6 rounded-2xl shadow-md space-y-6">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2"><CubeIcon className="w-5 h-5"/> Pre-Estimation (Before Cleaning)</h2>
            <p className="text-sm text-gray-500 mt-1">Record the items exactly as the customer brings them in. Final valuation will happen after melting.</p>
          </div>
          
          {items.map((item, idx) => (
            <div key={idx} className="border p-4 rounded-xl space-y-4 bg-gray-50">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-sm text-gray-700">Item {idx + 1}</h3>
                {items.length > 1 && (
                  <button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-red-500 text-xs font-bold bg-red-50 px-2 py-1 rounded">
                    Remove
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input type="text" placeholder="Item Name (e.g. Chain)" value={item.name} onChange={e => updateItem(idx, 'name', e.target.value)} className="border p-2 rounded-lg" />
                <input type="number" placeholder="Count (Pieces)" value={item.count} onChange={e => updateItem(idx, 'count', e.target.value)} className="border p-2 rounded-lg" />
                <select value={item.purity} onChange={e => updateItem(idx, 'purity', e.target.value)} className="border p-2 rounded-lg font-bold">
                  <option value="24K">24K</option>
                  <option value="22K">22K</option>
                  <option value="18K">18K</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                <div>
                  <label className="text-xs text-orange-700 font-bold mb-1 block">Pre-Gross Weight (g) *</label>
                  <input type="number" step="0.01" placeholder="Approx weight" value={item.preEstimationGrossWeight} onChange={e => updateItem(idx, 'preEstimationGrossWeight', e.target.value)} className="border-2 border-orange-200 bg-orange-50 p-2 rounded-lg w-full focus:border-orange-500 outline-none" />
                </div>
                
                {/* FIXED: Using parseFloat to safely check string values */}
                {parseFloat(item.itemPrice) > 0 && (
                  <div className="bg-green-50 border border-green-200 p-2 rounded-lg">
                    <p className="text-[10px] text-green-700 font-bold uppercase">Est. Value</p>
                    <p className="font-bold text-green-800">₹ {item.itemPrice}</p>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-xs text-gray-500 mb-1 block">Ornament Photos ({item.imageUrls.length})</p>
                <div className="flex gap-2">
                  <button onClick={() => openCamera('item', null, idx)} type="button" className="flex-1 bg-yellow-100 text-yellow-800 text-xs py-2 rounded-lg font-bold hover:bg-yellow-200 flex items-center justify-center gap-1">
                    <CameraIcon className="w-4 h-4" /> Snap
                  </button>
                  <label className="flex-1 bg-gray-200 text-gray-700 text-xs py-2 rounded-lg font-bold hover:bg-gray-300 flex items-center justify-center gap-1 cursor-pointer">
                    <DocumentArrowUpIcon className="w-4 h-4" /> File
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'item', null, idx)} />
                  </label>
                </div>
              </div>
              
              {item.imageUrls.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {item.imageUrls.map((url, i) => (
                    <div key={i} className="w-12 h-12 rounded border border-gray-300 overflow-hidden relative">
                      <img src={url} className="w-full h-full object-cover" />
                      <button onClick={() => {
                        const newItems = [...items];
                        newItems[idx].imageUrls = newItems[idx].imageUrls.filter((_, idx2) => idx2 !== i);
                        setItems(newItems);
                      }} className="absolute top-0 right-0 bg-red-500 text-white w-4 h-4 flex items-center justify-center text-[10px] rounded-bl">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          <button onClick={() => setItems([...items, { name: 'Ring', count: 1, purity: '22K', preEstimationGrossWeight: '', ratePerGram: 0, itemPrice: 0, imageUrls: [] }])} className="text-blue-600 text-sm font-bold bg-blue-50 px-4 py-2 rounded-lg">
            + Add Another Item
          </button>
          
          <div className="flex gap-4 pt-4 border-t">
            <button onClick={() => setStep(1)} className="bg-gray-100 px-6 py-2.5 rounded-lg font-bold flex-1">Back</button>
            <button onClick={handleSubmit} disabled={loading} className="bg-green-600 text-white px-6 py-2.5 rounded-lg font-bold flex-1 disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? 'Processing...' : 'Generate Estimate Agreement'}
            </button>
          </div>
        </div>
      )}

      <CameraCaptureModal isOpen={cameraOpen} onClose={() => setCameraOpen(false)} onCapture={handleCameraCapture} />
    </div>
  );
}