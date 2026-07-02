
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppStep, UserData, GeneratedContent, COUNTRIES, COMMON_JOBS, CVTemplate, PaymentStatus } from './types';
import { generateProfessionalDocuments } from './geminiService';
import { 
  FileText, MapPin, Briefcase, ChevronRight, ChevronLeft, Download, 
  CheckCircle2, CreditCard, Smartphone, ShieldCheck, Zap, Loader2, 
  HelpCircle, Mail, Clock, History, Layout, Eye, Trash2, Lock, Unlock, 
  AlertCircle, ShieldAlert, CheckCircle, XCircle, LogOut, Copy, Palette, Sparkles, Star, FileDown,
  Linkedin, Heart, Globe, Award, Target, MessageSquare, Menu, X, ArrowRight
} from 'lucide-react';
import Markdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import 'firebase/app';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDocs, deleteDoc, updateDoc, serverTimestamp, getDocFromServer, query, where } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

enum OperationType { CREATE = 'create', UPDATE = 'update', DELETE = 'delete', LIST = 'list', GET = 'get', WRITE = 'write' }
function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType, path,
    authInfo: {
      userId: auth.currentUser?.uid, email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified, isAnonymous: auth.currentUser?.isAnonymous
    }
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const LOGO_SVG = <svg viewBox="0 0 100 100" className="w-full h-full text-brand-500" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M10 30L50 10L90 30L90 70L50 90L10 70Z" className="fill-brand-100/50"/><path d="M50 10V90" /><path d="M10 30L90 70" /><path d="M10 70L90 30" /><circle cx="50" cy="50" r="15" className="fill-white" /><path d="M45 45L55 55M55 45L45 55" className="stroke-brand-600" /></svg>;
const ADMIN_PHONE = "0193428416";
const ADMIN_PASS = "Azerty2026@";
const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;

const AnimatedReviews = () => {
  const reviews = [
    "🔥 Amadou K. vient d'être embauché !",
    "✨ Cynthia E. a décroché 3 entretiens.",
    "⭐ Patrice M. a rejoint une multinationale.",
    "🚀 Fatou S. a généré son CV Startup.",
    "💼 Jean-Paul a réussi son test technique."
  ];
  return (
    <div className="w-full bg-slate-900 border-y border-slate-800 py-3 overflow-hidden flex no-print">
      <motion.div 
        animate={{ x: [0, -1000] }}
        transition={{ repeat: Infinity, ease: 'linear', duration: 20 }}
        className="flex shrink-0 items-center gap-12 whitespace-nowrap px-6"
      >
        {[...reviews, ...reviews, ...reviews].map((r, i) => (
           <span key={i} className="text-slate-400 font-medium text-xs md:text-sm tracking-wider uppercase flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-pulse"></span>
              {r}
           </span>
        ))}
      </motion.div>
    </div>
  );
};

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>('landing');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Auth States
  const [user, setUser] = useState<User | null>(null);
  const isLoggedIn = !!user;
  const userEmail = user?.email || '';
  
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authFullName, setAuthFullName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  
  const [userData, setUserData] = useState<UserData>({
    country: '', job: '', fullName: '', email: '', phone: '', city: '',
    education: '', experience: '', skills: '', bio: '', languages: '', hobbies: '', linkedin: '', tone: 'professional'
  });
  
  const [generated, setGenerated] = useState<GeneratedContent | null>(null);
  const [history, setHistory] = useState<GeneratedContent[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<CVTemplate>('modern');
  
  // Admin states
  const [adminPassInput, setAdminPassInput] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);

  // Payment states
  const [paymentSubStep, setPaymentSubStep] = useState<PaymentSubStep>('select');
  const [transRef, setTransRef] = useState('');
  const [paymentPhone, setPaymentPhone] = useState('');

  // Initialisation et Synchronisation
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let isMounted = true;

    // We delay the onAuthStateChanged subscription slightly to bypass a known Firebase Auth
    // assertion error in React Strict Mode during rapid mount/unmount.
    const timer = setTimeout(() => {
      if (!isMounted) return;
      unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        if (currentUser) {
          // Pre-fill fields if we can
          setUserData(prev => ({
            ...prev,
            fullName: prev.fullName || currentUser.displayName || '',
            email: prev.email || currentUser.email || ''
          }));
          // Fetch user history from Firestore
          const fetchHistory = async () => {
            try {
              const q = query(collection(db, 'cvs'), where('userId', '==', currentUser.uid));
              const querySnapshot = await getDocs(q);
              const userHistory: GeneratedContent[] = [];
              querySnapshot.forEach((docSnap) => {
                userHistory.push({ ...docSnap.data(), id: docSnap.id } as GeneratedContent);
              });
              setHistory(userHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            } catch (error) {
              handleFirestoreError(error, OperationType.LIST, 'cvs');
            }
          };
          fetchHistory();
        } else {
          setHistory([]);
        }
      });
    }, 50);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const updateData = (updates: Partial<UserData>) => {
    setUserData(prev => ({ ...prev, ...updates }));
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    if (!authEmail || !authPassword) {
      setAuthError("Veuillez remplir tous les champs.");
      setAuthLoading(false);
      return;
    }

    if (authMode === 'signup' && !authFullName) {
      setAuthError("Veuillez saisir votre nom complet.");
      setAuthLoading(false);
      return;
    }

    try {
      if (authMode === 'signup') {
        const userCredential = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
        await updateProfile(userCredential.user, { displayName: authFullName });
        // Also pre-fill the name and email in the CV editor!
        setUserData(prev => ({
          ...prev,
          fullName: authFullName,
          email: authEmail
        }));
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, authEmail, authPassword);
        // Pre-fill fields if we can
        setUserData(prev => ({
          ...prev,
          fullName: userCredential.user.displayName || prev.fullName || '',
          email: userCredential.user.email || prev.email || ''
        }));
      }
      setStep('context');
      // Reset fields
      setAuthEmail('');
      setAuthPassword('');
      setAuthFullName('');
    } catch (err: any) {
      console.error(err);
      let errMsg = "Une erreur s'est produite.";
      if (err.code === 'auth/email-already-in-use') {
        errMsg = "Cette adresse email est déjà utilisée.";
      } else if (err.code === 'auth/invalid-email') {
        errMsg = "Adresse email invalide.";
      } else if (err.code === 'auth/weak-password') {
        errMsg = "Le mot de passe doit contenir au moins 6 caractères.";
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        errMsg = "Email ou mot de passe incorrect.";
      } else if (err.message) {
        errMsg = err.message;
      }
      setAuthError(errMsg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    setStep('landing');
  };

  const saveToHistory = async (content: GeneratedContent) => {
    if (!user) return;
    try {
      const docRef = doc(db, 'cvs', content.id);
      const dataToSave = {
        ...content,
        userId: user.uid,
        ownerEmail: user.email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      await setDoc(docRef, dataToSave);
      setHistory(prev => [content, ...prev.filter(h => h.id !== content.id)]);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `cvs/${content.id}`);
    }
  };

  const updateInHistory = async (content: GeneratedContent) => {
    if (!user) return;
    try {
      const docRef = doc(db, 'cvs', content.id);
      const { id, ...rest } = content;
      const dataToSave = {
        ...rest,
        userId: user.uid,
        updatedAt: serverTimestamp()
      };
      await updateDoc(docRef, dataToSave);
      setHistory(prev => prev.map(h => h.id === content.id ? content : h));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `cvs/${content.id}`);
    }
  };

  const deleteFromHistory = async (id: string) => {
    if (window.confirm("Supprimer définitivement ce document de vos archives ?")) {
      try {
        await deleteDoc(doc(db, 'cvs', id));
        setHistory(prev => prev.filter(h => h.id !== id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `cvs/${id}`);
      }
    }
  };

  const updateRequestStatus = async (id: string, status: PaymentStatus, code?: string) => {
    // For admin, we are not storing all CVS, but we can update locally for the demo
    // We would need an admin route
    setHistory(prev => prev.map(h => {
      if (h.id === id) {
        const updated = { 
          ...h, 
          status, 
          paid: status === 'approved', 
          unlockCode: code || h.unlockCode,
          unlockTimestamp: status === 'approved' ? Date.now() : h.unlockTimestamp
        };
        // Wait, admin updates shouldn't bypass rules. We'll leave it local for the demo admin
        return updated;
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
      await saveToHistory(newContent);
      setStep('payment');
      setPaymentSubStep('select');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submitPaymentRef = async () => {
    if (!generated) return;
    const updated: GeneratedContent = {
      ...generated,
      status: 'pending',
      transactionRef: transRef,
      paymentPhone: paymentPhone
    };
    setGenerated(updated);
    await updateInHistory(updated);
    
    // Notification WhatsApp automatique à l'admin
    const message = `🚀 *Nouvelle Demande CV Express*%0A%0A👤 Nom : ${generated.userData.fullName}%0A📞 Tel Client : ${paymentPhone}%0A💸 Référence : ${transRef}%0A📄 Métier : ${generated.userData.job}`;
    const waLink = `https://wa.me/229${ADMIN_PHONE}?text=${message}`;
    window.open(waLink, '_blank');

    setPaymentSubStep('waiting_approval');
  };

  const handleAdminLogin = () => {
    if (adminPassInput === ADMIN_PASS) {
      setStep('admin-dashboard');
      setAdminPassInput('');
    } else { alert("Mot de passe incorrect."); }
  };

  // We are storing pending in a local state for the dashboard if needed, or simply filtering from history
  const getAdminRequests = () => history.filter(r => r.status === 'pending');

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
      case 'classic': return { container: "font-serif text-slate-900 bg-[#f5f2ed] border-slate-300", header: "border-b border-slate-900/20 pb-8 mb-8", accent: "text-slate-900", prose: "prose-slate" };
      case 'creative': return { container: "font-sans text-brand-950 bg-brand-50 border-brand-200", header: "border-b-4 border-brand-500 pb-8 mb-8", accent: "text-brand-600", prose: "prose-orange" };
      case 'executive': return { container: "font-serif text-slate-900 bg-white border-slate-200", header: "border-b-[6px] border-slate-900 pb-8 mb-8 text-center", accent: "text-slate-600", prose: "prose-slate" };
      case 'minimalist': return { container: "font-sans text-slate-900 bg-white border-transparent", header: "border-l-4 border-slate-900 pl-6 mb-12", accent: "text-slate-500", prose: "prose-slate" };
      case 'startup': return { container: "font-mono text-slate-900 bg-white border-2 border-slate-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]", header: "border-b-2 border-slate-900 pb-8 mb-8", accent: "text-brand-600", prose: "prose-slate" };
      case 'modern': default: return { container: "font-sans text-slate-800 bg-white border-slate-100", header: "border-b-2 border-brand-500 pb-8 mb-8", accent: "text-brand-500", prose: "prose-slate" };
    }
  };

  const renderCVLayout = (content: GeneratedContent, isPreview: boolean) => {
    const { cv, userData: ud, template } = content;
    const styles = getTemplateStyles(template);

    return (
      <div className={`w-full p-6 md:p-12 shadow-inner border transition-all ${styles.container}`}>
        <div className={`pb-6 mb-8 ${styles.header}`}>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter break-words">{ud.fullName}</h1>
          <p className={`text-lg md:text-xl font-bold uppercase mt-1 ${styles.accent}`}>{ud.job}</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-[10px] md:text-xs mt-6 font-medium text-slate-500 uppercase tracking-wider">
            <span className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {ud.city}, {ud.country}</span>
            <span className="flex items-center gap-2"><Mail className="w-4 h-4" /> {ud.email}</span>
            <span className="flex items-center gap-2"><Smartphone className="w-4 h-4" /> {ud.phone}</span>
            {ud.linkedin && <span className="flex items-center gap-2"><Linkedin className="w-4 h-4" /> {ud.linkedin}</span>}
          </div>
        </div>
        <div className={`relative ${isPreview ? 'max-h-80 md:max-h-96 overflow-hidden' : ''}`}>
          <div className={`text-sm md:text-base prose max-w-none leading-relaxed ${styles.prose} prose-headings:font-black prose-headings:uppercase prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-p:text-slate-700 prose-li:text-slate-700 prose-strong:text-slate-900`}>
             <Markdown rehypePlugins={[rehypeSanitize]}>{cv}</Markdown>
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
        <div className="space-y-4 text-center">
          <div className="w-20 h-20 bg-brand-50 text-brand-500 rounded-full flex items-center justify-center mx-auto shadow-sm">
            <ShieldCheck className="w-10 h-10" />
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            {authMode === 'login' ? "Connexion" : "Inscription"}
          </h2>
          <p className="text-slate-500 text-sm md:text-base font-medium">
            {authMode === 'login' 
              ? "Connectez-vous pour générer votre CV professionnel et accéder à vos archives."
              : "Créez votre compte unique et sécurisé pour commencer dès maintenant."}
          </p>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-5">
          {authMode === 'signup' && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Nom Complet
              </label>
              <input 
                type="text" 
                required
                placeholder="Ex: Jean Kouassi" 
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-800 outline-none focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 transition-all shadow-sm"
                value={authFullName} 
                onChange={(e) => setAuthFullName(e.target.value)} 
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Adresse Email
            </label>
            <input 
              type="email" 
              required
              placeholder="Ex: jean.kouassi@email.com" 
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-800 outline-none focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 transition-all shadow-sm"
              value={authEmail} 
              onChange={(e) => setAuthEmail(e.target.value)} 
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Mot de passe
            </label>
            <input 
              type="password" 
              required
              placeholder="••••••••" 
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-800 outline-none focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 transition-all shadow-sm"
              value={authPassword} 
              onChange={(e) => setAuthPassword(e.target.value)} 
            />
          </div>

          {authError && (
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold border border-red-200 flex items-center justify-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <button 
            type="submit" 
            disabled={authLoading}
            className="w-full bg-slate-900 text-white flex items-center justify-center gap-3 py-5 rounded-2xl text-lg font-black shadow-lg hover:bg-slate-800 disabled:opacity-50 transition-all active:scale-95 border-2 border-slate-800 cursor-pointer"
          >
            {authLoading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : authMode === 'login' ? (
              "Se connecter"
            ) : (
              "Créer mon compte"
            )}
          </button>
        </form>

        <div className="text-center space-y-4 pt-2">
          <p className="text-sm font-semibold text-slate-600">
            {authMode === 'login' ? (
              <>
                Nouveau sur CV Express ?{" "}
                <button 
                  type="button"
                  onClick={() => { setAuthMode('signup'); setAuthError(null); }}
                  className="text-brand-600 hover:text-brand-700 font-black underline cursor-pointer"
                >
                  S'inscrire
                </button>
              </>
            ) : (
              <>
                Déjà inscrit ?{" "}
                <button 
                  type="button"
                  onClick={() => { setAuthMode('login'); setAuthError(null); }}
                  className="text-brand-600 hover:text-brand-700 font-black underline cursor-pointer"
                >
                  Se connecter
                </button>
              </>
            )}
          </p>
          <p className="text-xs text-slate-400 font-medium max-w-sm mx-auto">
            Vos données sont 100% sécurisées. Chaque espace de connexion est chiffré et individuel.
          </p>
        </div>
      </div>
    </div>
  );

  const renderLanding = () => (
    <div className="space-y-0 pb-0">
      
      {/* Editorial Hero Recipe applied here */}
      <div className="relative bg-black text-white min-h-[90vh] flex flex-col justify-center overflow-hidden px-4 md:px-12 py-20 pb-40">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <img src="https://images.unsplash.com/photo-1573164713988-8665fc963095?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80" alt="Professional Background" className="w-full h-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/70 to-transparent"></div>
        </div>
        
        {/* Abstract Background SVGs */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-brand-500/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3 pointer-events-none z-0"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4 pointer-events-none z-0"></div>
        
        {/* Floating Remerciements Animation */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          {[
            { text: "Merci ! Mon CV a été retenu 🙏", top: "20%", left: "10%", delay: 0 },
            { text: "Super rendu, merci l'équipe !", top: "60%", left: "80%", delay: 2 },
            { text: "J'ai eu mon premier entretien 🤩", top: "80%", left: "20%", delay: 4 },
            { text: "Merci pour ce gain de temps", top: "30%", left: "70%", delay: 1.5 },
            { text: "Incroyable, 100% satisfait ✨", top: "45%", left: "15%", delay: 3.5 },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 50, scale: 0.8 }}
              animate={{ 
                opacity: [0, 1, 1, 0], 
                y: [50, -20, -50, -100],
                scale: [0.8, 1, 1, 0.9]
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                delay: item.delay,
                ease: "easeInOut"
              }}
              className="absolute bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs md:text-sm font-medium px-4 py-2 rounded-full shadow-xl"
              style={{ top: item.top, left: item.left }}
            >
              {item.text}
            </motion.div>
          ))}
        </div>

        <div className="max-w-7xl mx-auto w-full relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-10 pl-2 lg:pl-0">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-xs font-medium uppercase tracking-widest text-brand-300"
            >
              <Sparkles className="w-4 h-4" /> Nouvelle IA de Génération
            </motion.div>
            
            <motion.div 
               initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
               animate={{ opacity: 1, scale: 1, rotate: 0 }}
               transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
               className="space-y-4"
            >
              <h1 className="font-serif text-[12vw] lg:text-[7.5rem] leading-[0.85] font-light tracking-[-0.03em]">
                Propulsez<br />
                <span className="italic text-brand-500">votre carrière</span>
              </h1>
              <p className="text-xl md:text-2xl text-white/60 font-light max-w-lg leading-relaxed pt-6">
                Créez un CV et une lettre de motivation d'exception avec l'IA. Parfaitement calibrés pour recruter en Afrique.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-4 pt-4"
            >
              <button onClick={() => setStep(isLoggedIn ? 'context' : 'auth')} className="group flex items-center justify-between gap-6 bg-brand-500 text-white px-8 py-5 rounded-[2rem] text-lg font-medium hover:bg-brand-600 transition-all hover:pr-6 cursor-pointer">
                Commencer maintenant 
                <span className="bg-white text-brand-500 p-2 rounded-full group-hover:scale-110 transition-transform"><ArrowRight className="w-5 h-5" /></span>
              </button>
              <button onClick={() => setStep(isLoggedIn ? 'mes-cv' : 'auth')} className="px-8 py-5 rounded-[2rem] text-lg font-medium border border-white/20 hover:bg-white/5 transition-all">Consulter mes archives</button>
            </motion.div>
          </div>
          
          <div className="lg:col-span-5 hidden lg:block">
             <motion.div 
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 1, delay: 0.3 }}
                className="relative"
             >
                <div className="w-full aspect-[4/5] bg-gradient-to-br from-slate-800 to-slate-900 rounded-[2rem] border border-white/10 p-2 shadow-2xl relative overflow-hidden">
                   <video 
                     autoPlay 
                     loop 
                     muted 
                     playsInline
                     className="absolute inset-0 w-full h-full object-cover rounded-[1.5rem]"
                   >
                     <source src="https://cdn.coverr.co/videos/coverr-a-group-of-businesspeople-clapping-2693/1080p.mp4" type="video/mp4" />
                   </video>
                   <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-6 pt-12 rounded-b-[1.5rem]">
                     <p className="text-white text-sm font-medium uppercase tracking-widest mb-2 flex items-center gap-2"><Star className="w-4 h-4 text-brand-400 fill-brand-400" /> 100% Satisfaits</p>
                     <p className="text-lg font-light text-white font-serif">Des milliers de recruteurs convaincus.</p>
                   </div>
                </div>
             </motion.div>
          </div>
        </div>
      </div>

      {/* Modern B2B Section with Minimal Utility Recipe */}
      <div className="py-32 bg-[#f5f5f5] text-slate-900 px-4">
        <div className="max-w-7xl mx-auto space-y-24">
          <div className="text-center space-y-6 max-w-3xl mx-auto">
             <h2 className="text-4xl md:text-6xl font-light tracking-tight font-serif">Conçu pour l'excellence</h2>
             <p className="text-lg text-slate-500 font-light leading-relaxed">Notre technologie d'intelligence artificielle est entraînée sur des milliers de CV recrutés dans les meilleures entreprises panafricaines.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {[
              { icon: <Target className="w-8 h-8 text-brand-500" />, title: "Précision Chirurgicale", desc: "Des mots-clés optimisés pour les systèmes ATS des grandes entreprises." },
              { icon: <Palette className="w-8 h-8 text-brand-500" />, title: "Design Premium", desc: "6 templates uniques inspirés des codes du luxe et de la tech." },
              { icon: <Globe className="w-8 h-8 text-brand-500" />, title: "Localisation", desc: "Adaptation parfaite aux standards de recrutement de 15 pays africains." }
            ].map((feature, idx) => (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                key={idx} 
                className="bg-white rounded-3xl p-8 lg:p-10 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-xl transition-all"
              >
                <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mb-8">{feature.icon}</div>
                <h3 className="text-2xl font-serif mb-4">{feature.title}</h3>
                <p className="text-slate-500 font-light leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Avis Utilisateurs */}
      <div className="bg-slate-50 py-32 px-4 border-t border-slate-100 overflow-hidden">
        <div className="max-w-7xl mx-auto space-y-16 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-slate-200 pb-8">
            <h2 className="text-4xl md:text-5xl font-light font-serif tracking-tight">Ils ont décroché<br />l'entretien.</h2>
            <p className="text-brand-500 font-medium flex items-center gap-2"><Star className="w-5 h-5 fill-brand-500" /> 4.9/5 sur 2000+ avis</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { name: "Amadou K.", role: "Ingénieur Systèmes", country: "Sénégal", text: "Le design 'Startup' a tapé dans l'œil du directeur technique. Embauché en 2 semaines." },
              { name: "Cynthia E.", role: "Directrice Marketing", country: "Côte d'Ivoire", text: "La lettre de motivation générée était d'une précision incroyable. Très professionnelle." },
              { name: "Patrice M.", role: "Consultant Finance", country: "Cameroun", text: "Offre de création très avantageuse et moyens de paiement différents." }
            ].map((rev, i) => (
              <div key={i} className="group p-8 rounded-[2rem] border border-slate-200 hover:border-brand-300 transition-colors bg-slate-50 hover:bg-white">
                <div className="flex gap-1 mb-6">{[...Array(5)].map((_, j) => <Star key={j} className="w-5 h-5 fill-brand-500 text-brand-500" />)}</div>
                <p className="text-slate-700 font-light text-lg leading-relaxed mb-8">"{rev.text}"</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-900 text-white rounded-full flex items-center justify-center font-serif text-xl">{rev.name[0]}</div>
                  <div>
                    <p className="font-semibold text-slate-900">{rev.name}</p>
                    <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">{rev.role} • {rev.country}</p>
                  </div>
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
              <div className="w-16 h-16">{LOGO_SVG}</div>
            </div>
            <div className="space-y-4">
              <p className="text-sm font-black text-slate-700 uppercase tracking-wide">Payer par Mobile Money :</p>
              <button onClick={() => setPaymentSubStep('momo_instructions')} className="w-full flex items-center justify-between p-5 md:p-6 border-2 border-orange-500 bg-orange-50 rounded-2xl group transition-all">
                <div className="flex items-center gap-4"><Smartphone className="w-8 h-8 text-orange-500" /><span className="text-lg font-black text-orange-600">Celtis Cash</span></div>
                <ChevronRight className="w-6 h-6 text-orange-500" />
              </button>
              <div className="bg-slate-50 p-4 rounded-xl text-[10px] font-bold text-slate-400 italic">Celtis Cash est notre canal de paiement exclusif pour garantir un déblocage manuel prioritaire.</div>
            </div>
          </div>
        )}
        {paymentSubStep === 'momo_instructions' && (
          <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-slate-100 space-y-8 animate-in zoom-in-95 duration-300">
            <button onClick={() => setPaymentSubStep('select')} className="flex items-center gap-2 text-slate-400 text-xs font-black hover:text-slate-600"><ChevronLeft className="w-4 h-4"/> Retour</button>
            <div className="space-y-4 text-center">
               <h3 className="text-2xl font-black text-slate-900">Instructions Celtis</h3>
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
                <div className="space-y-1"><label className="text-xs font-black text-slate-400 uppercase tracking-widest">Votre numéro Celtis</label><input type="tel" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-lg font-black outline-none focus:border-orange-500 transition-colors" value={paymentPhone} onChange={e => setPaymentPhone(e.target.value)} placeholder="Ex: 01020304" /></div>
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
          { q: "Comment débloquer mon pack ?", a: "Après le transfert Celtis Cash de 2.000 FCFA au +229 0193428416, soumettez votre ID de transaction. Un agent validera manuellement votre accès." },
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
              {getAdminRequests().length === 0 ? (
                  <tr><td colSpan={3} className="px-8 py-16 text-center text-slate-300 font-bold italic">Aucune requête en attente de validation.</td></tr>
              ) : getAdminRequests().map(req => (
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
        <div className="w-8 h-8">{LOGO_SVG}</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 selection:bg-orange-100 selection:text-orange-900 font-sans flex flex-col">
      <nav className="no-print flex items-center justify-between px-4 md:px-6 py-4 bg-white border-b border-slate-100 sticky top-0 z-50 shadow-sm shrink-0">
        <div className="flex items-center gap-2 md:gap-3 cursor-pointer" onClick={() => setStep('landing')}>
          <div className="w-10 h-10">{LOGO_SVG}</div>
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
      
      <main className="flex-1 w-full flex flex-col print:bg-white overflow-x-hidden">
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
              <section className="bg-white"><h3 className="text-xl md:text-2xl font-black mb-10 border-b-2 border-slate-900 pb-4 no-print text-slate-900 uppercase tracking-tighter">Lettre de Motivation</h3><div className="font-serif text-slate-800 leading-relaxed text-sm md:text-base prose prose-slate max-w-none break-words"><Markdown rehypePlugins={[rehypeSanitize]}>{generated?.letter}</Markdown></div></section>
            </div>
          </div>
        )}
      </main>
      
      <AnimatedReviews />

      <footer className="bg-white py-12 md:py-16 px-6 no-print text-left">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10 md:gap-12">
          <div className="space-y-4 text-center md:text-left">
            <div className="flex items-center gap-3 justify-center md:justify-start">
              <div className="w-12 h-12">{LOGO_SVG}</div>
              <h4 className="font-black text-slate-900 uppercase text-lg tracking-tighter">CV Express Afrique</h4>
            </div>
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
        <div className="mt-12 text-center text-[10px] text-slate-300 font-black tracking-widest uppercase">© 2024-2025 CV Express Afrique • Celtis Cash Exclusif</div>
      </footer>
    </div>
  );

  function renderLeftPanel(title: React.ReactNode, subtitle: string, current: number) { return (
    <div className="hidden lg:flex flex-col justify-between bg-slate-900 text-white p-12 lg:p-20 relative overflow-hidden min-h-full">
      <div className="absolute inset-0 z-0">
        <img src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80" alt="Office Background" className="w-full h-full object-cover opacity-20 grayscale" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent"></div>
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-brand-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
      </div>
      <div className="relative z-10 space-y-4">
        <div className="flex gap-2">
           {[1, 2, 3].map(i => <div key={i} className={`h-1.5 w-12 rounded-full transition-all duration-500 ${i <= current ? 'bg-brand-500' : 'bg-slate-700'}`} />)}
        </div>
        <h2 className="text-4xl xl:text-5xl font-black tracking-tight pt-8 leading-[1.1]">{title}</h2>
        <p className="text-lg xl:text-xl text-slate-400 font-medium max-w-md leading-relaxed">{subtitle}</p>
      </div>
      <div className="relative z-10 flex items-center gap-4">
        <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20"><Sparkles className="w-6 h-6 text-brand-400" /></div>
        <div className="text-sm">
          <p className="font-bold">Généré par l'IA</p>
          <p className="text-slate-400">Optimisé pour les filtres ATS des recruteurs.</p>
        </div>
      </div>
    </div>
  ); }

  function renderMobileHeader(title: string, current: number) { return (
    <div className="lg:hidden space-y-4 mb-4">
      <div className="flex gap-1.5 justify-center">
        {[1, 2, 3].map(i => <div key={i} className={`h-1.5 w-8 rounded-full transition-all duration-500 ${i <= current ? 'bg-brand-500' : 'bg-slate-200'}`} />)}
      </div>
      <h2 className="text-3xl font-black text-center text-slate-900 tracking-tight">{title}</h2>
    </div>
  ); }

  function renderContext() { return (
    <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[calc(100vh-73px)] w-full">
      {renderLeftPanel(<><span className="text-brand-500">Objectifs</span><br/>& Style</>, "Définissez le poste ciblé et le ton pour que l'IA adapte votre profil sur-mesure.", 1)}
      <div className="flex flex-col justify-center p-6 lg:p-12 xl:p-16 bg-slate-50 min-h-full">
        <div className="max-w-xl mx-auto w-full space-y-8 animate-in slide-in-from-right-8 duration-500">
          {renderMobileHeader("Objectifs & Style", 1)}
          
          <div className="space-y-8">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2 uppercase tracking-wider"><MapPin className="w-4 h-4 text-brand-500" /> Quel est votre marché cible ?</label>
              <select className="w-full bg-white border-2 border-slate-200 rounded-2xl px-5 py-4 text-lg font-bold text-slate-800 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all appearance-none shadow-sm" value={userData.country} onChange={(e) => updateData({ country: e.target.value })}>
                <option value="">Choisir un pays...</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2 uppercase tracking-wider"><Briefcase className="w-4 h-4 text-brand-500" /> Poste ou métier visé</label>
              <input type="text" list="jobs" placeholder="Ex: Directeur Marketing, Dev Fullstack..." className="w-full bg-white border-2 border-slate-200 rounded-2xl px-5 py-4 text-lg font-bold text-slate-800 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all shadow-sm" value={userData.job} onChange={(e) => updateData({ job: e.target.value })} />
              <datalist id="jobs">{COMMON_JOBS.map(j => <option key={j} value={j} />)}</datalist>
            </div>

            <div className="space-y-3 pt-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2 uppercase tracking-wider"><MessageSquare className="w-4 h-4 text-brand-500" /> Ton de la lettre</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(['professional', 'creative', 'direct'] as const).map(t => (
                  <button key={t} onClick={() => updateData({ tone: t })} className={`p-5 rounded-2xl border-2 text-sm font-bold transition-all flex flex-col justify-center items-center gap-2 text-center ${userData.tone === t ? 'border-brand-500 bg-brand-50 text-brand-600 shadow-sm scale-[1.02]' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:border-slate-300'}`}>
                    {t === 'professional' && "Formel / Corpo"}
                    {t === 'creative' && "Créatif / Startup"}
                    {t === 'direct' && "Orienté Résultats"}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2 uppercase tracking-wider"><Palette className="w-4 h-4 text-brand-500" /> Design du CV</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {(['classic', 'modern', 'creative', 'executive', 'minimalist', 'startup'] as CVTemplate[]).map(t => (
                  <button key={t} onClick={() => setSelectedTemplate(t)} className={`p-4 rounded-2xl border-2 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${selectedTemplate === t ? 'border-brand-500 bg-brand-50 text-brand-600 shadow-sm scale-[1.02]' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:border-slate-300'}`}><Layout className="w-4 h-4 mb-[1px]" />{t}</button>
                ))}
              </div>
            </div>
            
            <div className="pt-6">
              <button disabled={!userData.country || !userData.job} onClick={() => setStep('personal')} className="w-full bg-brand-500 text-white py-5 rounded-2xl text-lg font-black tracking-wide shadow-[0_8px_20px_-8px_#ea580c] hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none disabled:bg-slate-300 transition-all flex items-center justify-center gap-3">
                Continuer <ArrowRight className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  ); }

  function renderPersonal() { return (
    <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[calc(100vh-73px)] w-full">
      {renderLeftPanel(<><span className="text-brand-500">Contact</span><br/>& Identité</>, "Saisissez vos coordonnées pour être contacté facilement par les recruteurs.", 2)}
      <div className="flex flex-col justify-center p-6 lg:p-12 xl:p-16 bg-slate-50 min-h-full">
        <div className="max-w-xl mx-auto w-full space-y-8 animate-in slide-in-from-right-8 duration-500">
          {renderMobileHeader("Identité & Contact", 2)}
          
          <div className="grid gap-6">
             <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nom Complet</label><input type="text" placeholder="Entrez votre nom complet..." className="w-full bg-white shadow-sm border-2 border-slate-200 rounded-2xl px-5 py-4 font-bold text-slate-800 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all" value={userData.fullName} onChange={(e) => updateData({ fullName: e.target.value })} /></div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Pro</label><input type="email" placeholder="votre@email.com" className="w-full bg-white shadow-sm border-2 border-slate-200 rounded-2xl px-5 py-4 font-bold text-slate-800 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all" value={userData.email} onChange={(e) => updateData({ email: e.target.value })} /></div>
                <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Téléphone / WhatsApp</label><input type="tel" placeholder="+229..." className="w-full bg-white shadow-sm border-2 border-slate-200 rounded-2xl px-5 py-4 font-bold text-slate-800 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all" value={userData.phone} onChange={(e) => updateData({ phone: e.target.value })} /></div>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ville de résidence</label><input type="text" placeholder="Ex: Cotonou, Abidjan..." className="w-full bg-white shadow-sm border-2 border-slate-200 rounded-2xl px-5 py-4 font-bold text-slate-800 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all" value={userData.city} onChange={(e) => updateData({ city: e.target.value })} /></div>
                <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Profil LinkedIn (Optionnel)</label><input type="url" placeholder="https://linkedin.com/in/..." className="w-full bg-white shadow-sm border-2 border-slate-200 rounded-2xl px-5 py-4 font-bold text-slate-800 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all" value={userData.linkedin} onChange={(e) => updateData({ linkedin: e.target.value })} /></div>
             </div>
          </div>
          <div className="flex gap-4 pt-6">
            <button onClick={() => setStep('context')} className="flex-1 bg-white border-2 border-slate-200 text-slate-600 py-4 rounded-2xl font-black text-lg hover:bg-slate-50 hover:border-slate-300 transition-all">Retour</button>
            <button disabled={!userData.fullName || !userData.email} onClick={() => setStep('experience')} className="flex-[2] bg-brand-500 text-white py-4 rounded-2xl font-black text-lg shadow-[0_8px_20px_-8px_#ea580c] disabled:bg-slate-300 disabled:shadow-none hover:-translate-y-0.5 disabled:translate-y-0 transition-all">Suivant <ArrowRight className="w-6 h-6 inline ml-2" /></button>
          </div>
        </div>
      </div>
    </div>
  ); }

  function renderExperience() { return (
    <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[calc(100vh-73px)] w-full">
      {renderLeftPanel(<><span className="text-brand-500">Parcours</span><br/>& Compétences</>, "Mettez vos expériences en vrac, l'intelligence artificielle se chargera de structurer et d'embellir le tout.", 3)}
      <div className="flex flex-col justify-center p-6 lg:p-12 xl:p-16 bg-slate-50 min-h-full">
        <div className="max-w-xl mx-auto w-full space-y-6 animate-in slide-in-from-right-8 duration-500">
          {renderMobileHeader("Parcours", 3)}
          
          <div className="space-y-6">
            <div className="space-y-2">
               <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex justify-between items-center">Expériences <span className="text-[10px] text-brand-500 bg-brand-50 px-2 py-0.5 rounded-full font-bold normal-case">En vrac, l'IA trie</span></label>
               <textarea placeholder="Ex: 2020-2023 : Vendeur chez Orange, a augmenté les ventes de 20%..." className="w-full bg-white shadow-sm border-2 border-slate-200 rounded-2xl px-5 py-4 h-32 font-medium text-slate-800 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-colors resize-y leading-relaxed placeholder:text-slate-400" value={userData.experience} onChange={(e) => updateData({ experience: e.target.value })} />
            </div>
            
            <div className="space-y-2">
               <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex justify-between items-center">Études & Diplômes <span className="text-[10px] text-brand-500 bg-brand-50 px-2 py-0.5 rounded-full font-bold normal-case">Récent en premier</span></label>
               <textarea placeholder="Ex: 2019 : Licence pro en Marketing à HEC Abidjan..." className="w-full bg-white shadow-sm border-2 border-slate-200 rounded-2xl px-5 py-4 h-24 font-medium text-slate-800 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-colors resize-y leading-relaxed placeholder:text-slate-400" value={userData.education} onChange={(e) => updateData({ education: e.target.value })} />
            </div>

            <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Compétences Techniques</label><textarea placeholder="Excel, Photoshop, Négociation B2B, ReactJS..." className="w-full bg-white shadow-sm border-2 border-slate-200 rounded-2xl px-5 py-4 h-24 font-medium text-slate-800 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-colors resize-y leading-relaxed placeholder:text-slate-400" value={userData.skills} onChange={(e) => updateData({ skills: e.target.value })} /></div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Langues (Optionnel)</label><input type="text" placeholder="Français (Natif)..." className="w-full bg-white shadow-sm border-2 border-slate-200 rounded-2xl px-5 py-4 font-medium text-slate-800 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-colors placeholder:text-slate-400" value={userData.languages} onChange={(e) => updateData({ languages: e.target.value })} /></div>
               <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Centres d'intérêt (Optionnel)</label><input type="text" placeholder="Lecture, Sport..." className="w-full bg-white shadow-sm border-2 border-slate-200 rounded-2xl px-5 py-4 font-medium text-slate-800 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-colors placeholder:text-slate-400" value={userData.hobbies} onChange={(e) => updateData({ hobbies: e.target.value })} /></div>
            </div>

            <div className="space-y-2 pt-2">
               <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex justify-between items-center">Objectif / Bio (Optionnel) <span className="text-[10px] text-brand-500 bg-brand-50 px-2 py-0.5 rounded-full font-bold normal-case">L'IA devinera</span></label>
               <textarea placeholder="Quel est votre objectif pour les 3 prochaines années ?" className="w-full bg-white shadow-sm border-2 border-slate-200 rounded-2xl px-5 py-4 h-24 font-medium text-slate-800 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-colors resize-y leading-relaxed placeholder:text-slate-400" value={userData.bio} onChange={(e) => updateData({ bio: e.target.value })} />
            </div>

            {error && <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold border border-red-200 flex items-center justify-center gap-2"><AlertCircle className="w-5 h-5"/> {error}</div>}
            
            <div className="flex gap-4 pt-6">
              <button onClick={() => setStep('personal')} className="flex-1 bg-white border-2 border-slate-200 text-slate-600 py-4 rounded-2xl font-black text-lg hover:bg-slate-50 hover:border-slate-300 transition-all">Retour</button>
              <button disabled={loading || !userData.education || !userData.experience} onClick={handleGenerate} className="flex-[2] bg-slate-900 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-slate-900/20 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2 hover:-translate-y-0.5 disabled:translate-y-0 transition-all">
                {loading ? <><Loader2 className="w-6 h-6 animate-spin" /> Génération...</> : <><Sparkles className="w-6 h-6 text-brand-400" /> Générer mon dossier</>}
              </button>
            </div>
          </div>
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
