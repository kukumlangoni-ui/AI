import React, { useState } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../App';

interface Package {
  id: string;
  name: string;
  price: string;
  benefits: string;
  amount: number;
}

const PACKAGES: Package[] = [
  { id: 'pkg_2k', name: 'Starter Pack', price: '2,000 TZS', benefits: '50 Credits', amount: 2000 },
  { id: 'pkg_5k', name: 'Basic Pack', price: '5,000 TZS', benefits: '150 Credits', amount: 5000 },
  { id: 'pkg_10k', name: 'Pro Pack', price: '10,000 TZS', benefits: '400 Credits', amount: 10000 },
  { id: 'pkg_30k', name: 'Max Pack', price: '30,000 TZS', benefits: 'Unlimited / 1500 Credits', amount: 30000 },
];

export const PaymentModal: React.FC<{ isOpen: boolean; onClose: () => void; userProfile: any; globalSettings: any }> = ({ isOpen, onClose, userProfile, globalSettings }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedPkg, setSelectedPkg] = useState<Package | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSelect = (pkg: Package) => {
    setSelectedPkg(pkg);
    setStep(2);
  };

  const handleWhatsApp = () => {
    if (!selectedPkg || !userProfile || !globalSettings) return;
    
    let msg = globalSettings.whatsappMessage || `Habari, nimelipia STEA package.\nName: {name}\nEmail: {email}\nPackage: {package}\nAmount: {amount}\nNinatuma screenshot ya malipo.`;
    msg = msg.replace('{name}', userProfile.name || 'N/A')
             .replace('{email}', userProfile.email || 'N/A')
             .replace('{package}', selectedPkg.name)
             .replace('{amount}', selectedPkg.price);
             
    const encodedMsg = encodeURIComponent(msg);
    const phone = globalSettings.whatsappNumber || '8619715852043';
    window.open(`https://wa.me/${phone}?text=${encodedMsg}`, '_blank');
  };

  const handleDone = async () => {
    if (!selectedPkg || !userProfile || !auth.currentUser) return;
    setLoading(true);
    const path = 'payments';
    try {
      await addDoc(collection(db, path), {
        userId: auth.currentUser.uid,
        name: userProfile.name,
        email: userProfile.email,
        package: selectedPkg.name,
        amount: selectedPkg.amount,
        paymentMethod: 'Vodacom',
        status: 'Pending',
        createdAt: serverTimestamp()
      });
      setStep(3);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      alert("Kuna tatizo, tafadhali jaribu tena.");
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    setStep(1);
    setSelectedPkg(null);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={resetAndClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        {step === 1 && (
          <>
            <h3 className="text-gold font-bold text-xl mb-2">Chagua Kifurushi</h3>
            <p className="text-sm text-gray-400 mb-4">Pata credits zaidi ili uendelee kutumia STEA.</p>
            <div className="flex flex-col gap-3">
              {PACKAGES.map(pkg => (
                <button 
                  key={pkg.id} 
                  className="w-full text-left p-4 border border-gold/30 rounded-xl hover:bg-gold/10 hover:border-gold transition-all flex justify-between items-center"
                  onClick={() => handleSelect(pkg)}
                >
                  <div>
                    <div className="font-bold text-white">{pkg.name}</div>
                    <div className="text-xs text-gold">{pkg.benefits}</div>
                  </div>
                  <div className="font-mono font-bold text-white">{pkg.price}</div>
                </button>
              ))}
            </div>
            <button className="mbtn ghost mt-4" onClick={resetAndClose}>Funga</button>
          </>
        )}

        {step === 2 && selectedPkg && (
          <>
            <h3 className="text-gold font-bold text-xl mb-2">Maelekezo ya Malipo</h3>
            <div className="bg-black/50 border border-gray-800 p-4 rounded-xl mb-4 text-sm space-y-2">
              <div className="flex justify-between border-b border-gray-800 pb-2">
                <span className="text-gray-400">Kifurushi:</span>
                <span className="font-bold text-white">{selectedPkg.name}</span>
              </div>
              <div className="flex justify-between border-b border-gray-800 pb-2">
                <span className="text-gray-400">Kiasi:</span>
                <span className="font-bold text-gold">{selectedPkg.price}</span>
              </div>
              <div className="pt-2">
                <p className="text-gray-400 mb-1">Tuma pesa kwenda:</p>
                <p className="font-bold text-white">Mtandao: Vodacom</p>
                <p className="font-bold text-white text-lg tracking-wider">{globalSettings?.whatsappNumber === '8619715852043' ? '0758 561 747' : globalSettings?.whatsappNumber}</p>
                <p className="font-bold text-white">Jina: Prosper maleko mfuru</p>
              </div>
            </div>
            
            <p className="text-xs text-gray-400 mb-4">
              Baada ya kutuma pesa, tafadhali tuma screenshot ya muamala wako kupitia WhatsApp.
            </p>

            <div className="flex flex-col gap-2">
              <button className="mbtn primary flex justify-center items-center gap-2 bg-[#25D366] text-white hover:bg-[#128C7E]" onClick={handleWhatsApp}>
                Tuma uthibitisho kwa WhatsApp
              </button>
              <button className="mbtn primary" onClick={handleDone} disabled={loading}>
                {loading ? 'Inatuma...' : 'Nimemaliza'}
              </button>
              <button className="mbtn ghost" onClick={() => setStep(1)}>Rudi Nyuma</button>
            </div>
          </>
        )}

        {step === 3 && (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <h3 className="text-gold font-bold text-xl mb-2">Asante!</h3>
            <p className="text-sm text-gray-400 mb-6">
              Malipo yako yamepokelewa na yanasubiri uhakiki. Credits zako zitaongezwa punde tu baada ya uhakiki kukamilika.
            </p>
            <button className="mbtn primary w-full" onClick={resetAndClose}>Funga</button>
          </div>
        )}
      </div>
    </div>
  );
};
