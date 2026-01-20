
import React, { useState, useEffect, useRef } from 'react';
import { AppStep, UserData, GeneratedContent, COUNTRIES, COMMON_JOBS, CVTemplate, PaymentStatus } from './types';
import { generateProfessionalDocuments } from './geminiService';
import { 
  FileText, MapPin, Briefcase, ChevronRight, ChevronLeft, Download, 
  CheckCircle2, CreditCard, Smartphone, ShieldCheck, Zap, Loader2, 
  HelpCircle, Mail, Clock, History, Layout, Eye, Trash2, Lock, Unlock, 
  AlertCircle, ShieldAlert, CheckCircle, XCircle, LogOut, Copy, Palette, Sparkles, Star, FileDown
} from 'lucide-react';

const LOGO_URL = "https://i.imgur.com/hZPhW7G.png";
const ADMIN_PHONE = "0193428416";
const ADMIN_PASS = "Azerty2026@";
const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;

type PaymentSubStep = 'select' | 'momo_instructions' | 'submit_ref' | 'waiting_approval';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>('landing');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Auth States pour la confidentialité
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userPass, setUserPass] = useState('');
  
  const [userData, setUserData] = useState<UserData>({
    country: '', job: '', fullName: '', email: '', phone: '', city: '',
    education: '', experience: '', skills: '', bio: ''
  });
  
  const [generated, setGenerated] = useState<GeneratedContent | null>(null);
  const [history, setHistory] = useState<GeneratedContent[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<CVTemplate>('modern');
  
  // Admin states
  const [adminPassInput, setAdminPassInput] = useState('');
  const [adminRequests, setAdminRequests] = useState<GeneratedContent[]>([]);
  const [inputCode, setInputCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);

  // Payment states
  const [paymentSubStep, setPaymentSubStep] = useState<PaymentSubStep>('select');
  const [transRef, setTransRef] = useState('');
  const [paymentPhone, setPaymentPhone] = useState('');

  // Initialisation et Synchronisation
  useEffect(() => {
    const saved = localStorage.getItem('cv_history');
    if (saved) {
      try { setHistory(JSON.parse(saved)); } catch (e) { console.error("Erreur chargement historique:", e); }
    }
    const savedEmail = localStorage.getItem('cv_user_email');
    if (savedEmail) {
      setUserEmail(savedEmail);
      setIsLoggedIn(true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('cv_history', JSON.stringify(history));
    setAdminRequests(history.filter(r => r.status === 'pending'));
  }, [history]);

  const updateData = (updates: Partial<UserData>) => {
    setUserData(prev => ({ ...prev, ...updates }));
  };

  const handleLogin = () => {
    if (userEmail && userPass) {
      localStorage.setItem('cv_user_email', userEmail);
      setIsLoggedIn(true);
      setStep('context');
    } else {
      alert("Veuillez remplir vos identifiants pour sécuriser vos données.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('cv_user_email');
    setIsLoggedIn(false);
    setUserEmail('');
    setUserPass('');
    setStep('landing');
  };

  const saveToHistory = (content: GeneratedContent) => {
    setHistory(prev => [
      { ...content, ownerEmail: userEmail },
      ...prev.filter(h => h.id !== content.id)
    ]);
  };

  const deleteFromHistory = (id: string) => {
    if (window.confirm("Supprimer définitivement ce document de vos archives ?")) {
      setHistory(prev => prev.filter(h => h.id !== id));
    }
  };

  const updateRequestStatus = (id: string, status: PaymentStatus, code?: string) => {
    setHistory(prev => prev.map(h => {
      if (h.id === id) {
        return { 
          ...h, 
          status, 
          paid: status === 'approved', 
          unlockCode: code || h.unlockCode,
          unlockTimestamp: status === 'approved' ? Date.now() : h.unlockTimestamp
        };
      }
      return h;
    }));
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await generateProfessionalDocuments(userData);
      const newContent: GeneratedContent = {
        id: Date.now().toString(),
        date: new Date().toLocaleDateString('fr-FR'),
        userData: { ...userData },
        cv: result.cv,
        letter: result.letter,
        paid: false,
        status: 'unpaid',
        template: selectedTemplate,
        ownerEmail: userEmail
      };
      setGenerated(newContent);
      saveToHistory(newContent);
      setStep('payment');
      setPaymentSubStep('select');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submitPaymentRef = () => {
    if (!generated) return;
    const updated: GeneratedContent = {
      ...generated,
      status: 'pending',
      transactionRef: transRef,
      paymentPhone: paymentPhone
    };
    setGenerated(updated);
    saveToHistory(updated);
    setPaymentSubStep('waiting_approval');
  };

  const handleAdminLogin = () => {
    if (adminPassInput === ADMIN_PASS) {
      setStep('admin-dashboard');
      setAdminPassInput('');
    } else { alert("Mot de passe incorrect."); }
  };

  const handleVerifyCode = () => {
    if (!generated) return;
    if (inputCode === generated.unlockCode) {
      const isExpired = Date.now() > (generated.unlockTimestamp || 0) + WEEK_IN_MS;
      if (!isExpired) { setStep('result'); }
      else { setCodeError("Code expiré. Validité 7 jours."); }
    } else { setCodeError("Code invalide."); }
  };

  const getTemplateStyles = (template: CVTemplate) => {
    switch (template) {
      case 'classic': return { container: "font-serif text-slate-900 bg-white border-slate-300", header: "border-b-4 border-slate-900", accent: "text-slate-900", prose: "prose-slate" };
      case 'creative': return { container: "font-sans text-orange-950 bg-orange-50/20 border-orange-200", header: "border-b-4 border-orange-500", accent: "text-orange-600", prose: "prose-orange" };
      case 'executive': return { container: "font-serif text-blue-950 bg-slate-50 border-blue-100", header: "border-b-4 border-blue-900", accent: "text-blue-900", prose: "prose-blue" };
      case 'modern': default: return { container: "font-sans text-slate-800 bg-white border-slate-100", header: "border-b-4 border-blue-600", accent: "text-blue-600", prose: "prose-blue" };
    }
  };

  const renderCVLayout = (content: GeneratedContent, isPreview: boolean) => {
    const { cv, userData: ud, template } = content;
    const lines = cv.split('\n');
    const displayLines = isPreview ? lines.slice(0, 10) : lines;
    const styles = getTemplateStyles(template);

    return (
      <div className={`w-full p-6 md:p-12 shadow-inner border transition-all ${styles.container}`}>
        <div className={`pb-6 mb-8 ${styles.header}`}>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter break-words">{ud.fullName}</h1>
          <p className={`text-lg md:text-xl font-bold uppercase mt-1 ${styles.accent}`}>{ud.job}</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-[10px] md:text-xs mt-4 font-semibold opacity-70">
            <span className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {ud.city}, {ud.country}</span>
            <span className="flex items-center gap-2"><Mail className="w-4 h-4" /> {ud.email}</span>
            <span className="flex items-center gap-2"><Smartphone className="w-4 h-4" /> {ud.phone}</span>
          </div>
        </div>
        <div className={`relative ${isPreview ? 'max-h-80 md:max-h-96 overflow-hidden' : ''}`}>
          <div className={`whitespace-pre-wrap text-sm md:text-base prose max-w-none leading-relaxed ${styles.prose}`}>
            {displayLines.join('\n')}
          </div>
          {isPreview && (
            <div className="absolute inset-x-0 bottom-0 h-32 md:h-40 bg-gradient-to-t from-white via-white/95 to-transparent flex items-end justify-center pb-8">
              <span className="bg-slate-900 text-white px-5 md:px-6 py-2 md:py-2.5 rounded-full text-[10px] md:text-xs font-black shadow-xl flex items-center gap-2 animate-bounce">
                <Lock className="w-4 h-4" /> Payer 2.000 FCFA pour débloquer
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderAuth = () => (
    <div className="max-w-xl mx-auto px-4 py-12 md:py-20 animate-in zoom-in duration-300">
      <div className="bg-white p-8 md:p-10 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl border border-slate-100 space-y-8 text-left">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto shadow-sm"><ShieldCheck className="w-8 h-8" /></div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Accès Sécurisé</h2>
          <p className="text-slate-400 text-sm font-medium">L'authentification garantit la confidentialité de vos dossiers.</p>
        </div>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email ou Téléphone</label>
            <input type="text" value={userEmail} onChange={e => setUserEmail(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold outline-none focus:border-orange-500 transition-colors" placeholder="votre@email.com" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mot de passe secret</label>
            <input type="password" value={userPass} onChange={e => setUserPass(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold outline-none focus:border-orange-500 transition-colors" placeholder="••••••••" />
          </div>
          <button onClick={handleLogin} className="w-full bg-orange-500 text-white py-4 md:py-5 rounded-2xl text-lg md:text-xl font-black shadow-lg hover:bg-orange-600 transition-all active:scale-95">Continuer vers mon espace</button>
        </div>
      </div>
    </div>
  );

  const renderLanding = () => (
    <div className="space-y-16 md:space-y-24 pb-24">
      {/* Hero */}
      <div className="flex flex-col items-center text-center px-4 pt-12 md:pt-16 max-w-3xl mx-auto space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="relative group">
          <div className="absolute -inset-1 bg-orange-500 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
          <img src={LOGO_URL} alt="Logo" className="relative w-28 h-28 md:w-40 md:h-40 object-contain rounded-2xl bg-white p-2 shadow-2xl" />
        </div>
        <div className="space-y-4">
          <h1 className="text-3xl md:text-7xl font-black text-slate-900 tracking-tight leading-tight">Propulsez votre carrière en <span className="text-orange-500">Afrique</span></h1>
          <p className="text-lg md:text-xl text-slate-600 font-medium leading-relaxed max-w-xl mx-auto">Générez un CV d'exception avec l'IA en 2 minutes. Standards locaux garantis et confidentialité totale.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center pt-4">
          <button onClick={() => setStep(isLoggedIn ? 'context' : 'auth')} className="bg-orange-500 text-white px-8 md:px-10 py-4 md:py-5 rounded-2xl text-lg md:text-xl font-black shadow-xl hover:bg-orange-600 transition-all active:scale-95 flex items-center justify-center gap-2">Créer mon Pack Pro <ChevronRight className="w-6 h-6" /></button>
          <button onClick={() => setStep(isLoggedIn ? 'mes-cv' : 'auth')} className="bg-white text-slate-700 border-2 border-slate-200 px-8 md:px-10 py-4 md:py-5 rounded-2xl text-lg md:text-xl font-bold hover:bg-slate-50 transition-all">Consulter mes CV</button>
        </div>
      </div>

      {/* Reviews */}
      <div className="max-w-6xl mx-auto px-6 space-y-12">
        <div className="text-center space-y-2">
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Ils ont réussi avec nous</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            {[
              { name: "Amadou K.", role: "Ingénieur IT", text: "CV impeccable généré en un clin d'oeil. Très pro et adapté au Sénégal.", stars: 5 },
              { name: "Cynthia E.", role: "Marketeuse", text: "La lettre de motivation m'a aidée à décrocher mon stage à Abidjan.", stars: 5 },
              { name: "Patrice M.", role: "Comptable", text: "Paiement MTN MoMo très fluide. Dossier validé en 10 minutes.", stars: 4 }
            ].map((rev, i) => (
              <div key={i} className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-4 text-left hover:shadow-md transition-shadow">
                <div className="flex gap-1">{[...Array(rev.stars)].map((_, j) => <Star key={j} className="w-4 h-4 fill-orange-500 text-orange-500" />)}</div>
                <p className="text-slate-600 font-medium italic text-sm md:text-base">"{rev.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center font-black text-orange-600">{rev.name[0]}</div>
                  <div><p className="font-black text-sm text-slate-900">{rev.name}</p><p className="text-[10px] text-slate-400 font-bold uppercase">{rev.role}</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderPayment = () => (
    <div className="max-w-5xl mx-auto px-4 py-8 md:py-12 grid grid-cols-1 lg:grid-cols-2 gap-12 text-left animate-in fade-in duration-500">
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-100 text-orange-600 rounded-full mb-2"><Eye className="w-6 h-6" /></div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Prévisualisation</h2>
          <p className="text-slate-500 text-sm font-medium italic">Effectuez le paiement pour débloquer le pack complet.</p>
        </div>
        {generated && renderCVLayout(generated, true)}
      </div>
      <div className="space-y-6 h-fit lg:sticky lg:top-24">
        {paymentSubStep === 'select' && (
          <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-8 shadow-2xl border border-slate-100 space-y-6">
            <div className="flex justify-between items-center pb-6 border-b border-slate-100">
              <div><p className="text-xs font-black text-slate-400 uppercase tracking-widest">Montant Unique</p><p className="text-4xl md:text-5xl font-black text-slate-900">2.000 <span className="text-xl">FCFA</span></p></div>
              <img src={LOGO_URL} className="w-16 h-16 object-contain" alt="Logo" />
            </div>
            <div className="space-y-4">
              <p className="text-sm font-black text-slate-700 uppercase tracking-wide">Payer par Mobile Money :</p>
              <button onClick={() => setPaymentSubStep('momo_instructions')} className="w-full flex items-center justify-between p-5 md:p-6 border-2 border-orange-500 bg-orange-50 rounded-2xl group transition-all">
                <div className="flex items-center gap-4"><Smartphone className="w-8 h-8 text-orange-500" /><span className="text-lg font-black text-orange-600">MTN MoMo</span></div>
                <ChevronRight className="w-6 h-6 text-orange-500" />
              </button>
              <div className="bg-slate-50 p-4 rounded-xl text-[10px] font-bold text-slate-400 italic">MTN MoMo est notre canal de paiement exclusif pour garantir un déblocage manuel prioritaire.</div>
            </div>
          </div>
        )}
        {paymentSubStep === 'momo_instructions' && (
          <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-slate-100 space-y-8 animate-in zoom-in-95 duration-300">
            <button onClick={() => setPaymentSubStep('select')} className="flex items-center gap-2 text-slate-400 text-xs font-black hover:text-slate-600"><ChevronLeft className="w-4 h-4"/> Retour</button>
            <div className="space-y-4 text-center">
               <h3 className="text-2xl font-black text-slate-900">Instructions MTN</h3>
               <p className="text-slate-500 text-sm font-medium">Envoyez <span className="font-black text-slate-900">2.000 FCFA</span> sur le numéro :</p>
               <div className="bg-slate-900 text-white p-5 md:p-6 rounded-3xl flex items-center justify-between group cursor-pointer" onClick={() => { navigator.clipboard.writeText(ADMIN_PHONE); alert("Copié !"); }}>
                  <div className="text-left"><p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] mb-1">Destinataire</p><p className="text-2xl md:text-3xl font-black tracking-widest">{ADMIN_PHONE}</p></div>
                  <Copy className="w-6 h-6 md:w-8 md:h-8 opacity-20 group-hover:opacity-100 transition-opacity" />
               </div>
            </div>
            <button onClick={() => setPaymentSubStep('submit_ref')} className="w-full bg-orange-500 text-white py-4 md:py-5 rounded-2xl text-lg md:text-xl font-black shadow-lg hover:bg-orange-600 transition-all">J'ai effectué le dépôt</button>
          </div>
        )}
        {paymentSubStep === 'submit_ref' && (
          <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-slate-100 space-y-6 animate-in slide-in-from-right-4 duration-300">
             <h3 className="text-2xl font-black text-slate-900">Soumission</h3>
             <div className="space-y-4">
                <div className="space-y-1"><label className="text-xs font-black text-slate-400 uppercase tracking-widest">Votre numéro MTN</label><input type="tel" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-lg font-black outline-none focus:border-orange-500 transition-colors" value={paymentPhone} onChange={e => setPaymentPhone(e.target.value)} placeholder="Ex: 01020304" /></div>
                <div className="space-y-1"><label className="text-xs font-black text-slate-400 uppercase tracking-widest">ID de Transaction</label><input type="text" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-lg font-black outline-none focus:border-orange-500 transition-colors" value={transRef} onChange={e => setTransRef(e.target.value)} placeholder="Ex: TXN12345" /></div>
                <button onClick={submitPaymentRef} className="w-full bg-orange-500 text-white py-4 md:py-5 rounded-2xl text-lg md:text-xl font-black shadow-lg">Valider mon paiement</button>
             </div>
          </div>
        )}
        {paymentSubStep === 'waiting_approval' && (
           <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-12 shadow-2xl border border-slate-100 flex flex-col items-center text-center space-y-6">
              <div className="w-20 h-20 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center animate-pulse"><Clock className="w-10 h-10" /></div>
              <h3 className="text-2xl font-black text-slate-900">Validation en cours</h3>
              <p className="text-slate-500 font-medium">Nos agents vérifient votre dépôt (5-15 min).</p>
              <button onClick={() => setStep('mes-cv')} className="w-full py-4 border-2 border-slate-100 rounded-2xl font-black text-slate-400 hover:text-orange-500 transition-all">Aller aux archives</button>
           </div>
        )}
      </div>
    </div>
  );

  const renderMesCV = () => (
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-12 space-y-8 md:space-y-12 text-left animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div><h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter">Mes Archives Privées</h2><p className="text-slate-400 text-sm font-medium">Connecté : {userEmail}</p></div>
        <div className="flex gap-2">
          <button onClick={handleLogout} className="p-3 bg-white border border-slate-100 text-slate-400 rounded-2xl hover:text-red-500 transition-all shadow-sm"><LogOut className="w-6 h-6" /></button>
          <button onClick={() => setStep('admin-login')} className="p-3 bg-slate-900 text-white rounded-2xl shadow-xl hover:bg-slate-800 transition-all"><ShieldAlert className="w-6 h-6" /></button>
        </div>
      </div>
      {history.filter(h => h.ownerEmail === userEmail).length === 0 ? (
        <div className="bg-white p-12 md:p-20 rounded-[2rem] md:rounded-[3rem] border-2 border-slate-50 text-center space-y-6 shadow-sm">
          <FileText className="w-16 h-16 text-slate-100 mx-auto" />
          <p className="text-slate-400 font-bold text-xl">Vos archives sont vides.</p>
          <button onClick={() => setStep('context')} className="bg-orange-500 text-white px-8 py-4 rounded-xl font-black shadow-lg hover:bg-orange-600 transition-all">Créer mon premier CV</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {history.filter(h => h.ownerEmail === userEmail).map(item => {
            const isApproved = item.status === 'approved';
            const isExpired = Date.now() > (item.unlockTimestamp || 0) + WEEK_IN_MS;
            return (
              <div key={item.id} className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all group flex flex-col justify-between h-full relative overflow-hidden">
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <div className="p-4 bg-orange-50 rounded-2xl group-hover:bg-orange-500 transition-colors"><FileText className="w-6 h-6 md:w-8 md:h-8 text-orange-500 group-hover:text-white" /></div>
                    <button onClick={() => deleteFromHistory(item.id)} className="text-slate-200 hover:text-red-500 p-2 transition-colors cursor-pointer z-10"><Trash2 className="w-6 h-6"/></button>
                  </div>
                  <h4 className="font-black text-xl text-slate-900 truncate">{item.userData.fullName}</h4>
                  <p className="text-sm text-orange-500 font-black mb-1 truncate uppercase tracking-widest">{item.userData.job}</p>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold mb-6 md:mb-8"><Clock className="w-3 h-3" /> {item.date}</div>
                </div>

                <div className="flex flex-col gap-3">
                  {isApproved && item.unlockCode && !isExpired && (
                    <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl text-center mb-1">
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Code de déblocage</p>
                      <p className="text-2xl font-black text-slate-900 tracking-[0.2em]">{item.unlockCode}</p>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <button onClick={() => { setGenerated(item); if(isApproved) setStep('unlock'); else setStep('payment'); }} className="flex-1 bg-slate-900 text-white py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-all">
                      <Eye className="w-4 h-4" /> {isApproved ? "Accéder" : "Débloquer"}
                    </button>
                    <span className={`text-[10px] px-3 py-1 rounded-lg font-black flex items-center uppercase tracking-tighter ${item.status==='approved'?(isExpired?'bg-red-50 text-red-500':'bg-emerald-100 text-emerald-600'):'bg-orange-100 text-orange-600'}`}>
                      {item.status === 'approved' ? (isExpired ? 'Expiré' : 'Approuvé') : item.status}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderTarifs = () => (
    <div className="max-w-4xl mx-auto px-4 py-12 md:py-16 space-y-12 text-center animate-in fade-in duration-500">
      <div className="space-y-4">
        <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter">Investissez dans votre succès</h2>
        <p className="text-slate-500 font-bold text-lg md:text-xl">Un pack pro complet au prix le plus juste du marché.</p>
      </div>
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-[2.5rem] md:rounded-[3rem] p-8 md:p-10 border-4 border-orange-500 shadow-2xl relative transition-all hover:scale-105">
          <div className="absolute top-0 right-0 bg-orange-500 text-white px-5 py-2 rounded-bl-3xl text-[10px] font-black tracking-widest uppercase">Offre Limitée</div>
          <div className="space-y-8 text-left">
            <h3 className="text-2xl md:text-3xl font-black">Pack Excellence IA</h3>
            <div className="flex items-baseline gap-2"><span className="text-5xl md:text-6xl font-black text-slate-900">2.000</span><span className="text-xl md:text-2xl font-bold text-slate-400 uppercase tracking-widest">FCFA</span></div>
            <ul className="space-y-4">
              {["CV IA Haute Qualité", "Lettre de Motivation IA", "Export PDF & Texte Brut", "Code d'accès 7 jours", "Archives Privées & Sécurisées"].map((item, i) => (
                <li key={i} className="flex items-center gap-4 text-xs md:text-sm font-bold text-slate-600"><CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 text-emerald-500 shrink-0" /> {item}</li>
              ))}
            </ul>
            <button onClick={() => setStep(isLoggedIn ? 'context' : 'auth')} className="w-full bg-orange-500 text-white py-4 md:py-5 rounded-2xl text-lg md:text-xl font-black shadow-xl hover:bg-orange-600 transition-all">Lancer mon dossier</button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAide = () => (
    <div className="max-w-4xl mx-auto px-4 py-12 md:py-16 space-y-12 text-center animate-in fade-in duration-500">
      <div className="space-y-4">
        <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-slate-900">Support & FAQ</h2>
        <p className="text-slate-500 text-lg md:text-xl font-medium italic">Tout ce qu'il faut savoir sur CV Express Afrique.</p>
      </div>
      <div className="space-y-6 max-w-3xl mx-auto text-left">
        {[
          { q: "Comment débloquer mon pack ?", a: "Après le transfert MTN MoMo de 2.000 FCFA au +229 0193428416, soumettez votre ID de transaction. Un agent validera manuellement votre accès." },
          { q: "Où s'affiche le code de déblocage ?", a: "Une fois votre paiement approuvé par nos agents, le code à 6 chiffres apparaîtra directement sur la carte de votre CV dans l'onglet 'Archives'." },
          { q: "Puis-je accéder à mon CV partout ?", a: "Oui, grâce à l'authentification sécurisée, connectez-vous avec votre email/tél et mot de passe depuis n'importe quel appareil." },
          { q: "Le code est-il permanent ?", a: "Chaque pack débloqué est accessible pendant 7 jours pour des raisons de sécurité. Pensez à exporter vos documents en PDF durant ce délai." }
        ].map((item, i) => (
          <div key={i} className="bg-white p-6 md:p-8 rounded-2xl border border-slate-100 shadow-sm space-y-3 hover:shadow-md transition-shadow">
            <h4 className="font-black text-slate-900 flex items-center gap-3 text-sm md:text-base"><HelpCircle className="w-5 h-5 text-orange-500 shrink-0" /> {item.q}</h4>
            <p className="text-xs md:text-sm text-slate-500 font-medium leading-relaxed pl-8 border-l-2 border-orange-100">{item.a}</p>
          </div>
        ))}
      </div>
      <button onClick={() => setStep('landing')} className="text-orange-500 font-black hover:underline transition-all">Retour à l'accueil</button>
    </div>
  );

  const renderAdminDashboard = () => (
    <div className="max-w-6xl mx-auto px-4 py-12 space-y-8 text-left animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 flex items-center gap-3 tracking-tighter"><ShieldAlert className="w-10 h-10 text-orange-500" /> Requêtes de déblocage</h2>
        <button onClick={() => setStep('landing')} className="flex items-center gap-2 text-slate-400 hover:text-red-500 font-black uppercase text-[10px] tracking-widest transition-all"><LogOut className="w-4 h-4" /> Déconnexion</button>
      </div>
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b">
              <tr>
                <th className="px-6 md:px-8 py-4 md:py-6">Candidat</th>
                <th className="px-6 md:px-8 py-4 md:py-6">Paiement</th>
                <th className="px-6 md:px-8 py-4 md:py-6 text-right">Décision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {adminRequests.length === 0 ? (
                  <tr><td colSpan={3} className="px-8 py-16 text-center text-slate-300 font-bold italic">Aucune requête en attente de validation.</td></tr>
              ) : adminRequests.map(req => (
                <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 md:px-8 py-4 md:py-6">
                    <p className="font-black text-slate-900 text-sm md:text-base">{req.userData.fullName}</p>
                    <p className="text-[10px] md:text-xs text-orange-500 font-bold uppercase tracking-widest">{req.userData.job}</p>
                  </td>
                  <td className="px-6 md:px-8 py-4 md:py-6">
                    <p className="font-mono text-[10px] md:text-xs font-black text-slate-700 bg-slate-100 px-2 py-1 rounded w-fit mb-1">{req.transactionRef}</p>
                    <p className="text-[10px] text-slate-400 font-bold">{req.paymentPhone}</p>
                  </td>
                  <td className="px-6 md:px-8 py-4 md:py-6 text-right space-x-2">
                    <button onClick={() => updateRequestStatus(req.id, 'approved', Math.random().toString(36).substring(2, 8).toUpperCase())} className="p-3 bg-emerald-500 text-white rounded-xl shadow-lg hover:bg-emerald-600 hover:scale-105 active:scale-95 transition-all"><CheckCircle className="w-5 h-5" /></button>
                    <button onClick={() => updateRequestStatus(req.id, 'rejected')} className="p-3 bg-red-500 text-white rounded-xl shadow-lg hover:bg-red-600 hover:scale-105 active:scale-95 transition-all"><XCircle className="w-5 h-5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderStepHeader = (title: string, current: number, total: number) => (
    <div className="w-full bg-white border-b border-slate-200 sticky top-0 z-50 no-print">
      <div className="max-w-xl mx-auto px-4 py-4 flex items-center justify-between">
        <button onClick={() => setStep(current === 1 ? 'landing' : (current === 2 ? 'context' : 'personal'))} className="p-2 -ml-2 text-slate-400 hover:text-orange-500 transition-all"><ChevronLeft className="w-6 h-6" /></button>
        <div className="text-center">
          <h2 className="text-base md:text-lg font-black text-slate-900 tracking-tight">{title}</h2>
          <div className="flex gap-1.5 justify-center mt-1.5">{[1, 2, 3].map(i => <div key={i} className={`h-1 w-6 md:w-8 rounded-full transition-all duration-500 ${i <= current ? 'bg-orange-500' : 'bg-slate-100'}`} />)}</div>
        </div>
        <img src={LOGO_URL} className="w-8 h-8 object-contain" alt="Logo" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 selection:bg-orange-100 selection:text-orange-900 font-sans">
      <nav className="no-print flex items-center justify-between px-4 md:px-6 py-4 bg-white border-b border-slate-100 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2 md:gap-3 cursor-pointer" onClick={() => setStep('landing')}>
          <img src={LOGO_URL} className="w-10 h-10 object-contain rounded-lg shadow-sm" alt="Logo" />
          <span className="text-xl md:text-2xl font-black tracking-tighter text-slate-900 hidden sm:block">CV Express <span className="text-orange-500">Afrique</span></span>
        </div>
        <div className="flex items-center gap-3 md:gap-4">
          <div className="hidden md:flex gap-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <button onClick={() => setStep('landing')} className={`hover:text-orange-500 transition-colors ${step==='landing'?'text-orange-500':''}`}>Accueil</button>
            <button onClick={() => setStep('tarifs')} className={`hover:text-orange-500 transition-colors ${step==='tarifs'?'text-orange-500':''}`}>Tarifs</button>
            <button onClick={() => setStep('aide')} className={`hover:text-orange-500 transition-colors ${step==='aide'?'text-orange-500':''}`}>Aide</button>
            <button onClick={() => setStep(isLoggedIn ? 'mes-cv' : 'auth')} className={`hover:text-orange-500 transition-colors ${step==='mes-cv'?'text-orange-500':''}`}>Archives</button>
          </div>
          <button onClick={() => setStep(isLoggedIn ? 'mes-cv' : 'auth')} className="p-3 bg-slate-50 rounded-2xl text-slate-400 hover:text-orange-500 transition-all border border-slate-100 shadow-sm"><History className="w-6 h-6" /></button>
        </div>
      </nav>
      
      <main className="print:bg-white overflow-x-hidden">
        {step === 'landing' && renderLanding()}
        {step === 'auth' && renderAuth()}
        {step === 'context' && renderContext()}
        {step === 'personal' && renderPersonal()}
        {step === 'experience' && renderExperience()}
        {step === 'payment' && renderPayment()}
        {step === 'mes-cv' && renderMesCV()}
        {step === 'tarifs' && renderTarifs()}
        {step === 'aide' && renderAide()}
        {step === 'admin-login' && renderAdminLogin()}
        {step === 'admin-dashboard' && renderAdminDashboard()}
        {step === 'unlock' && renderUnlock()}
        {step === 'result' && (
          <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-700 text-left">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print bg-slate-900 p-8 rounded-[2rem] text-white shadow-2xl">
              <div className="space-y-1"><h2 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-3">Débloqué <CheckCircle2 className="w-7 h-7 md:w-8 md:h-8 text-emerald-500" /></h2><p className="text-slate-400 text-sm font-medium italic">Téléchargez vos documents (Validité 7j).</p></div>
              <div className="flex flex-wrap gap-2 w-full md:w-auto">
                 <button onClick={() => { const el = document.getElementById('cv-full-content'); if(el) { (window as any).html2pdf().from(el).save(`CV_${generated?.userData.fullName}.pdf`); } }} className="flex-1 md:flex-none bg-orange-500 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:bg-orange-600 transition-all active:scale-95">PDF</button>
                 <button onClick={() => { if(generated) { const content = generated.cv + '\n' + generated.letter; const file = new Blob([content], {type: 'text/plain'}); const a = document.createElement("a"); a.href = URL.createObjectURL(file); a.download = `Pack_${generated.userData.fullName}.txt`; a.click(); } }} className="flex-1 md:flex-none bg-white text-slate-900 px-8 py-4 rounded-2xl font-black hover:bg-slate-50 transition-all active:scale-95">Texte</button>
              </div>
            </div>
            <div id="cv-full-content" className="space-y-12 bg-white shadow-2xl rounded-[2rem] md:rounded-[2.5rem] overflow-hidden p-6 md:p-16">
              <section className="print:block">{generated && renderCVLayout(generated, false)}</section>
              <div className="no-print h-px bg-slate-100 rounded-full my-12" />
              <section className="bg-white"><h3 className="text-xl md:text-2xl font-black mb-10 border-b-2 border-slate-900 pb-4 no-print text-slate-900 uppercase tracking-tighter">Lettre de Motivation</h3><div className="whitespace-pre-wrap font-serif text-slate-800 leading-relaxed text-sm md:text-base prose prose-slate max-w-none break-words">{generated?.letter}</div></section>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-slate-100 py-12 md:py-16 px-6 no-print text-left">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10 md:gap-12">
          <div className="space-y-4 text-center md:text-left">
            <div className="flex items-center gap-3 justify-center md:justify-start"><img src={LOGO_URL} className="w-12 h-12 object-contain" alt="Logo" /><h4 className="font-black text-slate-900 uppercase text-lg tracking-tighter">CV Express Afrique</h4></div>
            <p className="text-xs md:text-sm text-slate-400 font-bold max-w-sm">Solution SaaS d'IA n°1 pour les talents africains. Accélérez votre recrutement avec un dossier impeccable.</p>
          </div>
          <div className="flex flex-wrap justify-center md:justify-end gap-6 md:gap-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
             <button onClick={() => setStep('landing')} className="hover:text-orange-500 transition-colors">Accueil</button>
             <button onClick={() => setStep('tarifs')} className="hover:text-orange-500 transition-colors">Tarifs</button>
             <button onClick={() => setStep('aide')} className="hover:text-orange-500 transition-colors">Aide</button>
             <button onClick={() => setStep(isLoggedIn ? 'mes-cv' : 'auth')} className="hover:text-orange-500 transition-colors">Archives</button>
             <span className="flex items-center gap-2 text-emerald-500 font-black"><ShieldCheck className="w-4 h-4" /> 100% Sécurisé</span>
          </div>
        </div>
        <div className="mt-12 text-center text-[10px] text-slate-300 font-black tracking-widest uppercase">© 2024-2025 CV Express Afrique • MTN MoMo Exclusif</div>
      </footer>
    </div>
  );

  function renderContext() { return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
      {renderStepHeader("Étape 1 : Style & Pays", 1, 3)}
      <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 text-left">
        <div className="space-y-2">
          <label className="block text-sm font-bold text-slate-700 flex items-center gap-2"><MapPin className="w-4 h-4 text-orange-500" /> Pays de résidence</label>
          <select className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 text-lg font-medium focus:border-orange-500 outline-none transition-all appearance-none" value={userData.country} onChange={(e) => updateData({ country: e.target.value })}>
            <option value="">Choisir un pays...</option>
            {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-bold text-slate-700 flex items-center gap-2"><Palette className="w-4 h-4 text-orange-500" /> Thème Visuel</label>
          <div className="grid grid-cols-2 gap-3">
            {(['classic', 'modern', 'creative', 'executive'] as CVTemplate[]).map(t => (
              <button key={t} onClick={() => setSelectedTemplate(t)} className={`p-4 md:p-5 rounded-2xl border-2 text-[10px] md:text-xs font-black uppercase tracking-wider transition-all flex flex-col items-center gap-2 ${selectedTemplate === t ? 'border-orange-500 bg-orange-50 text-orange-600 shadow-inner' : 'border-slate-50 bg-slate-50 text-slate-400 hover:bg-slate-100'}`}><Layout className="w-5 h-5 opacity-50" />{t}</button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-bold text-slate-700 flex items-center gap-2"><Briefcase className="w-4 h-4 text-orange-500" /> Métier visé</label>
          <input type="text" list="jobs" placeholder="Ex: Comptable, Commercial..." className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 text-lg font-medium outline-none focus:border-orange-500 transition-all" value={userData.job} onChange={(e) => updateData({ job: e.target.value })} />
          <datalist id="jobs">{COMMON_JOBS.map(j => <option key={j} value={j} />)}</datalist>
        </div>
        <button disabled={!userData.country || !userData.job} onClick={() => setStep('personal')} className="w-full bg-orange-500 text-white py-5 rounded-2xl text-lg md:text-xl font-black shadow-xl shadow-orange-100 disabled:opacity-50 disabled:bg-slate-300 transition-all active:scale-95 flex items-center justify-center gap-2">Continuer <ChevronRight className="w-6 h-6" /></button>
      </div>
    </div>
  ); }

  function renderPersonal() { return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
      {renderStepHeader("Étape 2 : Identité", 2, 3)}
      <div className="space-y-5 animate-in slide-in-from-right-4 duration-300 text-left">
        <div className="space-y-1"><label className="text-xs font-black text-slate-400 uppercase tracking-widest">Nom Complet</label><input type="text" placeholder="NOM & Prénoms" className="w-full bg-white border-2 border-slate-50 rounded-2xl px-5 py-3.5 md:py-4 font-medium outline-none focus:border-orange-500 transition-colors" value={userData.fullName} onChange={(e) => updateData({ fullName: e.target.value })} /></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <div className="space-y-1"><label className="text-xs font-black text-slate-400 uppercase tracking-widest">Email</label><input type="email" placeholder="email@exemple.com" className="w-full bg-white border-2 border-slate-50 rounded-2xl px-5 py-3.5 font-medium outline-none focus:border-orange-500 transition-colors" value={userData.email} onChange={(e) => updateData({ email: e.target.value })} /></div>
           <div className="space-y-1"><label className="text-xs font-black text-slate-400 uppercase tracking-widest">Téléphone</label><input type="tel" placeholder="+229 ..." className="w-full bg-white border-2 border-slate-50 rounded-2xl px-5 py-3.5 font-medium outline-none focus:border-orange-500 transition-colors" value={userData.phone} onChange={(e) => updateData({ phone: e.target.value })} /></div>
        </div>
        <div className="space-y-1"><label className="text-xs font-black text-slate-400 uppercase tracking-widest">Ville</label><input type="text" placeholder="Ex: Cotonou, Abidjan..." className="w-full bg-white border-2 border-slate-50 rounded-2xl px-5 py-3.5 font-medium outline-none focus:border-orange-500 transition-colors" value={userData.city} onChange={(e) => updateData({ city: e.target.value })} /></div>
        <div className="flex gap-4 pt-4">
          <button onClick={() => setStep('context')} className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-all">Retour</button>
          <button disabled={!userData.fullName || !userData.email} onClick={() => setStep('experience')} className="flex-[2] bg-orange-500 text-white py-4 rounded-2xl font-black shadow-lg shadow-orange-100 disabled:bg-slate-300 transition-all active:scale-95">Continuer</button>
        </div>
      </div>
    </div>
  ); }

  function renderExperience() { return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
      {renderStepHeader("Étape 3 : Parcours", 3, 3)}
      <div className="space-y-5 animate-in slide-in-from-right-4 duration-300 text-left">
        <div className="space-y-1"><label className="text-xs font-black text-slate-400 uppercase tracking-widest">Études & Diplômes</label><textarea placeholder="Master, Licence, BAC..." className="w-full bg-white border-2 border-slate-50 rounded-2xl px-5 py-3.5 h-24 font-medium outline-none focus:border-orange-500 transition-colors resize-none" value={userData.education} onChange={(e) => updateData({ education: e.target.value })} /></div>
        <div className="space-y-1"><label className="text-xs font-black text-slate-400 uppercase tracking-widest">Expériences Professionnelles</label><textarea placeholder="Lieux et dates..." className="w-full bg-white border-2 border-slate-50 rounded-2xl px-5 py-3.5 h-32 font-medium outline-none focus:border-orange-500 transition-colors resize-none" value={userData.experience} onChange={(e) => updateData({ experience: e.target.value })} /></div>
        <div className="space-y-1"><label className="text-xs font-black text-slate-400 uppercase tracking-widest">Compétences</label><input type="text" placeholder="Ex: Excel, Vente..." className="w-full bg-white border-2 border-slate-50 rounded-2xl px-5 py-3.5 font-medium outline-none focus:border-orange-500 transition-colors" value={userData.skills} onChange={(e) => updateData({ skills: e.target.value })} /></div>
        {error && <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-100 animate-bounce">{error}</div>}
        <div className="flex gap-4 pt-4">
          <button onClick={() => setStep('personal')} className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold hover:bg-slate-200">Retour</button>
          <button disabled={loading || !userData.education || !userData.experience} onClick={handleGenerate} className="flex-[2] bg-orange-500 text-white py-4 rounded-2xl font-black shadow-lg shadow-orange-100 disabled:bg-slate-300 flex items-center justify-center gap-2 transition-all active:scale-95">
            {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Génération...</> : "Générer mon pack"}
          </button>
        </div>
      </div>
    </div>
  ); }

  function renderUnlock() { return (
    <div className="max-w-xl mx-auto px-4 py-16 space-y-8 animate-in zoom-in duration-300 text-center">
      <div className="space-y-4">
        <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto shadow-inner"><Lock className="w-10 h-10" /></div>
        <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Accès Sécurisé</h2>
        <p className="text-slate-500 text-sm font-medium italic">Saisissez le code de déblocage pour voir vos documents.</p>
      </div>
      <div className="bg-white p-8 md:p-10 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl border border-slate-100 space-y-6 text-left">
        <div className="space-y-2">
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest text-center block">Code Unique à 6 chiffres</label>
          <input type="text" placeholder="ABC123" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 md:py-5 text-2xl md:text-3xl font-black text-center text-slate-900 uppercase tracking-[0.3em] outline-none focus:border-orange-500 transition-colors" value={inputCode} onChange={(e) => { setInputCode(e.target.value.toUpperCase()); setCodeError(null); }} />
          {codeError && <div className="flex items-center gap-2 text-red-500 text-xs font-black justify-center"><AlertCircle className="w-4 h-4" /> {codeError}</div>}
        </div>
        <button onClick={handleVerifyCode} className="w-full bg-orange-500 text-white py-4 md:py-5 rounded-2xl text-lg md:text-xl font-black shadow-lg hover:bg-orange-600 transition-all active:scale-95 flex items-center justify-center gap-3">
          <Unlock className="w-6 h-6" /> Débloquer maintenant
        </button>
      </div>
      <button onClick={() => setStep('mes-cv')} className="block mx-auto text-slate-400 font-bold hover:text-orange-500 transition-all">Retour aux archives</button>
    </div>
  ); }

  function renderAdminLogin() { return (
    <div className="max-w-xl mx-auto px-4 py-20 animate-in zoom-in duration-300 text-center">
       <div className="bg-white p-12 rounded-[2.5rem] md:rounded-[3rem] shadow-2xl border border-slate-100 space-y-8">
          <ShieldAlert className="w-16 h-16 text-orange-500 mx-auto animate-pulse" />
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Administration</h2>
          <div className="space-y-4 text-left">
             <input type="password" placeholder="Mot de passe secret" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 text-center text-xl font-black outline-none focus:border-orange-500 transition-colors" value={adminPassInput} onChange={(e) => setAdminPassInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()} />
             <button onClick={handleAdminLogin} className="w-full bg-slate-900 text-white py-5 rounded-2xl text-xl font-black shadow-lg hover:bg-slate-800 transition-all active:scale-95">S'identifier</button>
          </div>
          <button onClick={() => setStep('landing')} className="text-slate-400 font-bold hover:text-orange-500 transition-all">Annuler</button>
       </div>
    </div>
  ); }

};

export default App;
