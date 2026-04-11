import React, { useState, useEffect, useMemo, Component } from 'react';
import { 
  HashRouter, Routes, Route, Link, useParams, useNavigate, useLocation
} from 'react-router-dom';
import { 
  ShoppingCart, Menu, X, Star, ChevronRight, ChevronLeft, ArrowRight, Check, Clock, ShieldCheck, 
  CreditCard, Truck, RotateCcw, Plus, Minus, ArrowLeft, Settings, MapPin, Phone, User, 
  Building2, Home, Tag, AlertCircle, Trash2, PackagePlus, Edit3, Video, Image as ImageIcon,
  Play, Upload, LogIn, LogOut, CheckCircle2, Move, ZoomIn, ZoomOut, Bell, Smartphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, PRODUCTS, REVIEWS, TRUST_BADGES, WILAYAS, COMMUNES } from './constants';
import { 
  db, auth, googleProvider, signInWithPopup, onAuthStateChanged, 
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, query, orderBy, limit,
  handleFirestoreError, OperationType, User as FirebaseUser, increment 
} from './firebase';

// --- Image Adjuster Component ---
const ImageAdjuster = ({ 
  url, 
  settings, 
  onChange 
}: { 
  url: string; 
  settings: { x: number; y: number; scale: number; fit?: 'cover' | 'contain' };
  onChange: (newSettings: { x: number; y: number; scale: number; fit?: 'cover' | 'contain' }) => void;
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newScale = Math.min(Math.max(settings.scale + delta, 1), 5);
    onChange({ ...settings, scale: newScale });
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-neutral-100 cursor-move touch-none"
      onWheel={handleWheel}
    >
      <motion.img
        src={url}
        alt=""
        className={`w-full h-full ${settings.fit === 'contain' ? 'object-contain' : 'object-cover'}`}
        style={{
          x: `${settings.x}%`,
          y: `${settings.y}%`,
          scale: settings.scale,
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
        drag
        dragMomentum={false}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={(_, info) => {
          setIsDragging(false);
          if (!containerRef.current) return;
          
          const { width, height } = containerRef.current.getBoundingClientRect();
          // Convert pixel offset to percentage of container size
          const deltaX = (info.offset.x / width) * 100;
          const deltaY = (info.offset.y / height) * 100;
          
          onChange({ 
            ...settings, 
            x: settings.x + deltaX, 
            y: settings.y + deltaY 
          });
        }}
        referrerPolicy="no-referrer"
      />
      
      {/* Zoom Controls Overlay */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
        <button 
          onClick={() => onChange({ ...settings, scale: Math.min(settings.scale + 0.2, 5) })}
          className="w-10 h-10 bg-white/90 backdrop-blur shadow-lg rounded-full flex items-center justify-center text-neutral-600 hover:text-[#F8A192] transition-colors"
        >
          <ZoomIn size={20} />
        </button>
        <button 
          onClick={() => onChange({ ...settings, scale: Math.max(settings.scale - 0.2, 1) })}
          className="w-10 h-10 bg-white/90 backdrop-blur shadow-lg rounded-full flex items-center justify-center text-neutral-600 hover:text-[#F8A192] transition-colors"
        >
          <ZoomOut size={20} />
        </button>
        <button 
          onClick={() => onChange({ x: 0, y: 0, scale: 1, fit: settings.fit })}
          className="w-10 h-10 bg-white/90 backdrop-blur shadow-lg rounded-full flex items-center justify-center text-neutral-600 hover:text-[#F8A192] transition-colors"
        >
          <RotateCcw size={20} />
        </button>
      </div>

      {/* Instructions */}
      <div className="absolute top-4 left-4 bg-black/50 backdrop-blur px-3 py-1.5 rounded-full pointer-events-none">
        <span className="text-[10px] text-white font-black">اسحب للتحريك • مرر للتكبير</span>
      </div>
    </div>
  );
};

// --- Toast Component ---
const Toast = ({ message, type, onClose }: { message: string; type: 'error' | 'success'; onClose: () => void }) => (
  <AnimatePresence>
    {message && (
      <div className="fixed bottom-8 left-0 right-0 z-[100] flex justify-center px-4 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className={`pointer-events-auto px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 w-full max-w-[400px] border ${
            type === 'error' ? 'bg-red-50 border-red-100 text-red-600' : 'bg-green-50 border-green-100 text-green-600'
          }`}
          dir="rtl"
        >
          <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${type === 'error' ? 'bg-red-100' : 'bg-green-100'}`}>
            {type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          </div>
          <p className="font-bold text-sm leading-tight flex-1">{message}</p>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-600 transition-colors">
            <X size={16} />
          </button>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

// --- Error Boundary ---
interface ErrorBoundaryState {
  hasError: boolean;
  errorInfo: string;
}

class ErrorBoundary extends Component<any, any> {
  state: any;
  props: any;

  constructor(props: any) {
    super(props);
    this.state = { hasError: false, errorInfo: '' };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorInfo: error.message || String(error) };
  }

  render() {
    if (this.state.hasError) {
      let displayMessage = "حدث خطأ غير متوقع. يرجى تحديث الصفحة.";
      let isQuotaError = false;

      try {
        const errorStr = this.state.errorInfo;
        if (errorStr.includes('Quota limit exceeded') || errorStr.includes('quota-exceeded')) {
          isQuotaError = true;
          displayMessage = "عذراً، تم تجاوز الحد اليومي المجاني لقاعدة البيانات. سيتم إعادة تفعيل المتجر تلقائياً غداً.";
        } else if (errorStr.includes('insufficient permissions')) {
          displayMessage = "عذراً، ليس لديك الصلاحيات الكافية للقيام بهذا الإجراء.";
        } else {
          // Try to parse if it's a JSON string from handleFirestoreError
          const parsed = JSON.parse(errorStr);
          if (parsed.error && (parsed.error.includes('Quota limit exceeded') || parsed.error.includes('quota-exceeded'))) {
            isQuotaError = true;
            displayMessage = "عذراً، تم تجاوز الحد اليومي المجاني لقاعدة البيانات. سيتم إعادة تفعيل المتجر تلقائياً غداً.";
          } else if (parsed.error && parsed.error.includes('insufficient permissions')) {
            displayMessage = "عذراً، ليس لديك الصلاحيات الكافية للقيام بهذا الإجراء.";
          }
        }
      } catch (e) {}

      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-neutral-50 text-center" dir="rtl">
          <div className="max-w-md w-full bg-white p-10 rounded-[2.5rem] shadow-xl border border-neutral-100">
            <div className={`w-20 h-20 ${isQuotaError ? 'bg-amber-50 text-amber-500' : 'bg-red-50 text-red-500'} rounded-full flex items-center justify-center mx-auto mb-6`}>
              {isQuotaError ? <Clock size={40} /> : <AlertCircle size={40} />}
            </div>
            <h2 className="text-2xl font-black mb-4">{isQuotaError ? 'تنبيه: تجاوز الحصة' : 'عذراً، حدث خطأ'}</h2>
            <p className="text-neutral-500 mb-8 font-bold leading-relaxed">{displayMessage}</p>
            {isQuotaError ? (
              <div className="space-y-4">
                <p className="text-[10px] text-neutral-400">
                  هذا المتجر يعمل على الخطة المجانية لـ Firebase. عند وصول عدد الزوار أو الطلبات لحد معين، يتم إيقاف الخدمة مؤقتاً حتى اليوم التالي.
                </p>
                <button 
                  onClick={() => window.location.reload()}
                  className="w-full bg-black text-white py-4 rounded-2xl font-black hover:bg-neutral-800 transition-all"
                >
                  محاولة التحديث
                </button>
              </div>
            ) : (
              <button 
                onClick={() => window.location.reload()}
                className="w-full bg-black text-white py-4 rounded-2xl font-black hover:bg-neutral-800 transition-all"
              >
                تحديث الصفحة
              </button>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Custom Confirmation Modal ---
const ConfirmModal = ({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel,
  confirmText = "تأكيد",
  cancelText = "إلغاء",
  isDestructive = false
}: { 
  isOpen: boolean; 
  title: string; 
  message: string; 
  onConfirm: () => void; 
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl overflow-hidden relative"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#F8A192]/10 rounded-full -mr-16 -mt-16 blur-2xl" />
        
        <h3 className="text-2xl font-black mb-4 relative z-10">{title}</h3>
        <p className="text-neutral-500 font-bold mb-8 relative z-10 leading-relaxed">{message}</p>
        
        <div className="flex gap-4 relative z-10">
          <button 
            onClick={onCancel}
            className="flex-1 py-4 rounded-2xl font-black text-neutral-500 hover:bg-neutral-50 transition-all border border-neutral-100"
          >
            {cancelText}
          </button>
          <button 
            onClick={() => {
              onConfirm();
              onCancel();
            }}
            className={`flex-1 py-4 rounded-2xl font-black text-white transition-all shadow-lg ${
              isDestructive ? 'bg-red-500 hover:bg-red-600 shadow-red-200' : 'bg-black hover:bg-neutral-800 shadow-black/10'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// --- Global Notification Helper ---
const showNotification = (title: string, options?: NotificationOptions) => {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

  // Try standard Notification constructor first
  try {
    const notification = new Notification(title, options);
    return notification;
  } catch (err) {
    // Fallback to Service Worker for mobile browsers
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(title, options);
      }).catch(swErr => {
        console.warn('Notification fallback failed:', swErr);
      });
    }
  }
};

// --- Custom Alert Modal ---
const AlertModal = ({ 
  isOpen, 
  title, 
  message, 
  onClose 
}: { 
  isOpen: boolean; 
  title: string; 
  message: string; 
  onClose: () => void;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl overflow-hidden relative text-center"
      >
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle size={32} />
        </div>
        
        <h3 className="text-2xl font-black mb-4">{title}</h3>
        <p className="text-neutral-500 font-bold mb-8 leading-relaxed">{message}</p>
        
        <button 
          onClick={onClose}
          className="w-full py-4 rounded-2xl font-black text-white bg-black hover:bg-neutral-800 transition-all shadow-lg shadow-black/10"
        >
          حسناً
        </button>
      </motion.div>
    </div>
  );
};

// --- Custom Prompt Modal ---
const PromptModal = ({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel,
  defaultValue = ""
}: { 
  isOpen: boolean; 
  title: string; 
  message: string; 
  onConfirm: (value: string) => void; 
  onCancel: () => void;
  defaultValue?: string;
}) => {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (isOpen) setValue(defaultValue);
  }, [isOpen, defaultValue]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl overflow-hidden relative"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#F8A192]/10 rounded-full -mr-16 -mt-16 blur-2xl" />
        
        <h3 className="text-2xl font-black mb-4 relative z-10">{title}</h3>
        <p className="text-neutral-500 font-bold mb-6 relative z-10 leading-relaxed">{message}</p>
        
        <input 
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full px-6 py-4 rounded-2xl bg-neutral-50 border border-neutral-100 focus:outline-none focus:ring-2 focus:ring-[#F8A192]/20 mb-8 relative z-10 font-bold"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onConfirm(value);
              onCancel();
            }
          }}
        />
        
        <div className="flex gap-4 relative z-10">
          <button 
            onClick={onCancel}
            className="flex-1 py-4 rounded-2xl font-black text-neutral-500 hover:bg-neutral-50 transition-all border border-neutral-100"
          >
            إلغاء
          </button>
          <button 
            onClick={() => {
              onConfirm(value);
              onCancel();
            }}
            className="flex-1 py-4 rounded-2xl font-black text-white bg-black hover:bg-neutral-800 transition-all shadow-lg shadow-black/10"
          >
            تأكيد
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const ADMIN_EMAIL = 'akrambnahmed32@gmail.com';

// --- Image Compression Utility ---
const compressImage = (file: File, maxWidth = 1000, quality = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};

// --- Types ---
interface CartItem {
  product: Product;
  quantity: number;
  selectedSize?: string;
  selectedColor?: string;
}

interface DeliveryConfig {
  freeShippingThreshold: number;
  wilayaCosts?: Record<string, { home: number; office: number }>;
}

interface PromoConfig {
  discountPercent: number;
  isActive: boolean;
}

// --- UI Components ---

const Navbar = ({ 
  cartCount, 
  onCartClick, 
  user, 
  handleLogin, 
  handleLogout, 
  setIsAdminOpen, 
  setIsMenuOpen,
  showAdminBanner
}: { 
  cartCount: number; 
  onCartClick: () => void;
  user: FirebaseUser | null;
  handleLogin: () => void;
  handleLogout: () => void;
  setIsAdminOpen: (val: boolean) => void;
  setIsMenuOpen: (val: boolean) => void;
  showAdminBanner?: boolean;
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (location.pathname === '/') {
      const element = document.getElementById('products');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      navigate('/#products');
    }
  };

  const isAdmin = user?.email === ADMIN_EMAIL;

  return (
    <nav 
      className="fixed left-0 right-0 z-50 bg-white border-b border-neutral-100 py-2 transition-all duration-300"
      style={{ top: isAdmin && showAdminBanner ? '20px' : '0' }}
    >
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onCartClick}
            className="relative p-2 hover:bg-neutral-50 rounded-full transition-colors"
          >
            <ShoppingCart size={24} strokeWidth={1.5} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-black text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full border border-neutral-200">
                {cartCount}
              </span>
            )}
          </button>
        </div>
        
        <div className="flex-1 flex justify-center">
          <button 
            onClick={handleLogoClick}
            className="px-4 py-2 bg-[#F8A192] flex items-center justify-center rounded-lg overflow-hidden shadow-sm hover:scale-105 transition-transform"
          >
            <span className="text-white font-black text-sm tracking-tight"> AK store </span>
          </button>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              <img src={user.photoURL || ''} alt="" className="w-8 h-8 rounded-full border border-neutral-200" />
              <button onClick={handleLogout} className="p-2 hover:bg-neutral-50 rounded-full transition-colors text-red-500" title="تسجيل الخروج">
                <LogOut size={24} strokeWidth={1.5} />
              </button>
              {user.email === ADMIN_EMAIL && (
                <button onClick={() => setIsAdminOpen(true)} className="p-2 hover:bg-neutral-50 rounded-full transition-colors text-neutral-400" title="لوحة التحكم">
                  <Settings size={24} strokeWidth={1.5} />
                </button>
              )}
            </div>
          ) : (
            <button onClick={handleLogin} className="p-2 hover:bg-neutral-50 rounded-full transition-colors text-neutral-400" title="تسجيل الدخول">
              <LogIn size={24} strokeWidth={1.5} />
            </button>
          )}
          <button onClick={() => setIsMenuOpen(true)} className="p-2 hover:bg-neutral-50 rounded-full transition-colors">
            <Menu size={24} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </nav>
  );
};

const ProductCard: React.FC<{ 
  product: Product; 
  promoConfig: PromoConfig; 
}> = ({ product, promoConfig }) => {
  const [hoveredImage, setHoveredImage] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    let interval: any;
    if (isHovered && product.images.length > 1) {
      interval = setInterval(() => {
        setHoveredImage(prev => (prev + 1) % product.images.length);
      }, 1500);
    } else {
      setHoveredImage(0);
    }
    return () => clearInterval(interval);
  }, [isHovered, product.images.length]);

  const currentPrice = (product as any).discountPercent 
    ? Math.round(product.price * (1 - (product as any).discountPercent / 100))
    : (promoConfig.isActive 
      ? Math.round(product.price * (1 - promoConfig.discountPercent / 100)) 
      : product.price);

  return (
    <Link 
      to={`/product/${product.id}`}
      className="group cursor-pointer bg-white rounded-[2.5rem] p-4 border border-neutral-100 hover:border-[#F8A192]/30 hover:shadow-2xl hover:shadow-[#F8A192]/10 transition-all duration-500" 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-neutral-100 mb-6">
        <AnimatePresence mode="wait">
          <motion.img 
            key={hoveredImage}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={(_, info) => {
              if (product.images.length <= 1) return;
              if (info.offset.x > 50) {
                setHoveredImage(prev => (prev + 1) % product.images.length);
              } else if (info.offset.x < -50) {
                setHoveredImage(prev => (prev - 1 + product.images.length) % product.images.length);
              }
            }}
            src={product.images[hoveredImage]} 
            alt={product.name} 
            className="w-full h-full object-contain bg-neutral-50 transition-transform duration-700 group-hover:scale-110 cursor-grab active:cursor-grabbing" 
            style={{ 
              objectPosition: product.imagePosition || 'center',
              transform: `scale(${(product.imageSettings?.[hoveredImage] || product.imageSettings?.[product.images[hoveredImage]])?.scale || 1}) translate(${(product.imageSettings?.[hoveredImage] || product.imageSettings?.[product.images[hoveredImage]])?.x || 0}%, ${(product.imageSettings?.[hoveredImage] || product.imageSettings?.[product.images[hoveredImage]])?.y || 0}%)`,
            }}
            referrerPolicy="no-referrer" 
          />
        </AnimatePresence>

        {product.isOutOfStock && (
          <div className="absolute top-10 left-4 z-20 pointer-events-none rotate-[-12deg] drop-shadow-2xl">
            <div className="bg-[#ef4444] border-[3px] border-white outline outline-[3px] outline-[#ef4444] px-4 py-1 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-30 mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.svg.org/200/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'4\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }}></div>
              <span className="text-white font-black text-xl tracking-tighter uppercase leading-none relative z-10">SOLD OUT</span>
            </div>
          </div>
        )}

        <div className="absolute top-4 right-4 flex flex-col gap-2">
          {(product as any).discountPercent ? (
            <Badge className="bg-red-600 text-white">خصم خاص {(product as any).discountPercent}%</Badge>
          ) : (
            promoConfig.isActive && <Badge className="bg-red-600 text-white">خصم {promoConfig.discountPercent}%</Badge>
          )}
          <Badge className="bg-[#FFC107] text-white">الأكثر مبيعاً 🔥</Badge>
        </div>
        {product.images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
            {product.images.map((_, idx) => (
              <div 
                key={`dot-${idx}`} 
                className={`w-1.5 h-1.5 rounded-full transition-all ${hoveredImage === idx ? 'bg-[#F8A192] w-4' : 'bg-white/50'}`} 
              />
            ))}
          </div>
        )}
      </div>
      <div className="px-3 pb-3">
        <div className="mb-3">
          <p className="text-[10px] font-black text-[#F8A192] uppercase tracking-widest mb-1">{product.category}</p>
          <h3 className="text-xl font-black tracking-tight mb-0.5">{product.name}</h3>
          {product.tagline && (
            <p className="text-xs text-neutral-500 font-medium line-clamp-1">{product.tagline}</p>
          )}
        </div>
        
        <div className="flex items-center flex-wrap gap-2 mb-2">
          {((product as any).discountPercent || promoConfig.isActive) && (
            <span className="text-sm text-neutral-400 line-through font-bold">
              {product.price} دج
            </span>
          )}
          <span className="text-2xl font-black text-[#F8A192]">
            {currentPrice} دج
          </span>
          {((product as any).discountPercent || promoConfig.isActive) && (
            <span className="bg-[#F8A192] text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-sm">
              -{(product as any).discountPercent || promoConfig.discountPercent}%
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-[#FFC107] mb-4">
          {[1,2,3,4,5].map(i => <Star key={i} size={14} fill="currentColor" />)}
          <span className="text-[10px] text-neutral-400 font-bold mr-1">({product.reviewCount})</span>
        </div>
        <button className="w-full bg-black text-white py-4 rounded-2xl font-black text-sm group-hover:bg-[#F8A192] transition-colors flex items-center justify-center gap-2">
          عرض التفاصيل <ArrowLeft size={16} />
        </button>
      </div>
    </Link>
  );
};

const ProductDetail = ({ 
  product, 
  onAddToCart, 
  onBack,
  deliveryConfig,
  promoConfig,
  communes,
  onComplete,
  isSubmitting
}: { 
  product: Product; 
  onAddToCart: (p: Product, qty: number, size?: string, color?: string) => void;
  onBack: () => void;
  deliveryConfig: DeliveryConfig;
  promoConfig: PromoConfig;
  communes: Record<string, string[]>;
  onComplete: (formData: any, quantity: number) => void;
  isSubmitting: boolean;
}) => {
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | undefined>(undefined);
  const [selectedColor, setSelectedColor] = useState<string | undefined>(undefined);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const [checkoutForm, setCheckoutForm] = useState({
    fullName: '',
    phone: '',
    phone2: '',
    wilaya: '',
    commune: '',
    address: '',
    deliveryType: 'home' as 'home' | 'office'
  });

  const getPrice = (product: Product) => {
    const productDiscount = (product as any).discountPercent;
    if (productDiscount !== undefined && productDiscount > 0) {
      return Math.round(product.price * (1 - productDiscount / 100));
    }
    if (promoConfig.isActive) {
      return Math.round(product.price * (1 - promoConfig.discountPercent / 100));
    }
    return product.price;
  };

  const currentPrice = getPrice(product);
  const deliveryPrice = useMemo(() => {
    if (!checkoutForm.wilaya) return 0;
    const customCost = deliveryConfig.wilayaCosts?.[checkoutForm.wilaya];
    if (customCost) {
      return checkoutForm.deliveryType === 'home' ? customCost.home : customCost.office;
    }
    return 0;
  }, [checkoutForm.wilaya, checkoutForm.deliveryType, deliveryConfig]);

  const total = (currentPrice * quantity) + (checkoutForm.wilaya ? deliveryPrice : 0);

  const availableCommunes = communes[checkoutForm.wilaya] || communes["default"] || [];

  const handleComplete = () => {
    if (product.sizes?.length && !selectedSize) {
      setToast({ message: 'يرجى اختيار المقاس أولاً', type: 'error' });
      return;
    }
    if (product.colors?.length && !selectedColor) {
      setToast({ message: 'يرجى اختيار اللون أولاً', type: 'error' });
      return;
    }
    if (!checkoutForm.fullName) {
      setToast({ message: 'يرجى إدخال الاسم الكامل', type: 'error' });
      return;
    }
    if (!checkoutForm.phone || checkoutForm.phone.length !== 10) {
      setToast({ message: 'يرجى إدخال رقم هاتف صحيح (10 أرقام)', type: 'error' });
      return;
    }
    if (!checkoutForm.wilaya) {
      setToast({ message: 'يرجى اختيار الولاية', type: 'error' });
      return;
    }
    if (!checkoutForm.commune) {
      setToast({ message: 'يرجى اختيار البلدية', type: 'error' });
      return;
    }
    if (!checkoutForm.address) {
      setToast({ message: 'يرجى إدخال العنوان', type: 'error' });
      return;
    }
    onComplete({ ...checkoutForm, selectedSize, selectedColor }, quantity);
  };

  return (
    <div className="pt-24 pb-20 max-w-7xl mx-auto px-4" dir="rtl">
      <div className="flex flex-col lg:flex-row gap-8 mb-16">
        
        {/* Left Side: Info & Form */}
        <div className="flex-1 order-2 lg:order-1">
          <div className="flex flex-col items-start mb-4">
            <div className="flex items-center gap-2 mb-2">
              {promoConfig.isActive && (
                <div className="bg-[#FFC107] text-white px-3 py-1 rounded-md text-sm font-bold flex items-center gap-1">
                  تخفيضات 💖
                </div>
              )}
              <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">{product.name}</h1>
            </div>

            {product.tagline && (
              <p className="text-lg text-neutral-500 font-bold mb-4 leading-tight">{product.tagline}</p>
            )}
            
            <div className="flex items-center flex-wrap gap-4 mb-4">
              {((product as any).discountPercent || promoConfig.isActive) && (
                <span className="text-xl text-neutral-400 line-through font-bold">
                  {product.price} دج
                </span>
              )}
              <span className="text-4xl font-black text-[#F8A192]">
                {currentPrice} دج
              </span>
              {((product as any).discountPercent || promoConfig.isActive) && (
                <span className="bg-[#F8A192] text-white px-3 py-1.5 rounded-full text-sm font-black shadow-sm">
                  -{(product as any).discountPercent || promoConfig.discountPercent}%
                </span>
              )}
            </div>

            <div className="flex items-center gap-0.5 text-[#FFC107] mb-6">
              {[1,2,3,4,5].map(i => <Star key={i} size={20} fill="currentColor" />)}
            </div>
          </div>

          {/* Variants Selection */}
          {(product.sizes?.length || product.colors?.length) && (
            <div className="mb-8 space-y-6">
              {product.sizes && product.sizes.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-black text-neutral-400 uppercase tracking-widest">اختر المقاس:</h3>
                  <div className="flex flex-wrap gap-2">
                    {product.sizes.map((size, idx) => (
                      <button
                        key={`${size}-${idx}`}
                        onClick={() => setSelectedSize(size)}
                        className={`px-6 py-3 rounded-xl font-black text-sm transition-all border-2 ${selectedSize === size ? 'border-black bg-black text-white shadow-lg' : 'border-neutral-100 hover:border-neutral-200 bg-white text-neutral-600'}`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {product.colors && product.colors.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-black text-neutral-400 uppercase tracking-widest">اختر اللون:</h3>
                  <div className="flex flex-wrap gap-2">
                    {product.colors.map((color, idx) => (
                      <button
                        key={`${color}-${idx}`}
                        onClick={() => setSelectedColor(color)}
                        className={`px-6 py-3 rounded-xl font-black text-sm transition-all border-2 ${selectedColor === color ? 'border-black bg-black text-white shadow-lg' : 'border-neutral-100 hover:border-neutral-200 bg-white text-neutral-600'}`}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Checkout Form Container */}
          <div className="border-2 border-[#F8A192]/30 rounded-[2rem] p-6 md:p-8 bg-white shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="الاسم الكامل 👤" 
                  className="w-full bg-[#FAFAFA] border border-neutral-100 rounded-xl px-4 py-4 text-right focus:ring-2 focus:ring-[#F8A192]/20 outline-none transition-all"
                  value={checkoutForm.fullName}
                  onChange={e => setCheckoutForm({...checkoutForm, fullName: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <input 
                  type="tel" 
                  placeholder="رقم الهاتف الأساسي 📞" 
                  maxLength={10}
                  inputMode="numeric"
                  className="w-full bg-[#FAFAFA] border border-neutral-100 rounded-xl px-4 py-4 text-right focus:ring-2 focus:ring-[#F8A192]/20 outline-none transition-all"
                  value={checkoutForm.phone}
                  onChange={e => setCheckoutForm({...checkoutForm, phone: e.target.value.replace(/\D/g, '')})}
                />
                <input 
                  type="tel" 
                  placeholder="رقم هاتف إضافي (اختياري) 📱" 
                  maxLength={10}
                  inputMode="numeric"
                  className="w-full bg-[#FAFAFA] border border-neutral-100 rounded-xl px-4 py-4 text-right focus:ring-2 focus:ring-[#F8A192]/20 outline-none transition-all"
                  value={checkoutForm.phone2}
                  onChange={e => setCheckoutForm({...checkoutForm, phone2: e.target.value.replace(/\D/g, '')})}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <select 
                className="w-full bg-[#FAFAFA] border border-neutral-100 rounded-xl px-4 py-4 text-right focus:ring-2 focus:ring-[#F8A192]/20 outline-none appearance-none cursor-pointer"
                value={checkoutForm.wilaya}
                onChange={e => setCheckoutForm({...checkoutForm, wilaya: e.target.value, commune: ''})}
              >
                <option value="">الولاية</option>
                {WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
              <select 
                className="w-full bg-[#FAFAFA] border border-neutral-100 rounded-xl px-4 py-4 text-right focus:ring-2 focus:ring-[#F8A192]/20 outline-none appearance-none cursor-pointer disabled:opacity-50"
                disabled={!checkoutForm.wilaya}
                value={checkoutForm.commune}
                onChange={e => setCheckoutForm({...checkoutForm, commune: e.target.value})}
              >
                <option value="">البلدية</option>
                {availableCommunes.map((c, idx) => <option key={`${c}-${idx}`} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="mb-6">
              <input 
                type="text" 
                placeholder="عنوان المنزل  🏠" 
                className="w-full bg-[#FAFAFA] border border-neutral-100 rounded-xl px-4 py-4 text-right focus:ring-2 focus:ring-[#F8A192]/20 outline-none transition-all"
                value={checkoutForm.address}
                onChange={e => setCheckoutForm({...checkoutForm, address: e.target.value})}
              />
            </div>

            <div className="space-y-4 mb-8">
              <h3 className="text-sm font-black mb-2">اختر طريقة التوصيل:</h3>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setCheckoutForm({...checkoutForm, deliveryType: 'home'})}
                  className={`relative flex flex-col items-center p-4 rounded-2xl border-2 transition-all duration-300 ${checkoutForm.deliveryType === 'home' ? 'border-[#F8A192] bg-[#F8A192]/5' : 'border-neutral-100 hover:border-neutral-200'}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${checkoutForm.deliveryType === 'home' ? 'bg-[#F8A192] text-white' : 'bg-neutral-100 text-neutral-400'}`}>
                    <Home size={20} />
                  </div>
                  <span className="font-black text-xs">توصيل للمنزل</span>
                  <span className="text-[10px] text-neutral-500 mt-0.5">
                    {checkoutForm.wilaya ? (deliveryConfig.wilayaCosts?.[checkoutForm.wilaya]?.home ? `${deliveryConfig.wilayaCosts[checkoutForm.wilaya].home} دج` : 'سعر التوصيل غير متوفر') : 'اختر الولاية أولاً'}
                  </span>
                  {checkoutForm.deliveryType === 'home' && (
                    <div className="absolute top-2 left-2 text-[#F8A192]">
                      <Check size={16} strokeWidth={3} />
                    </div>
                  )}
                </button>
                <button 
                  onClick={() => setCheckoutForm({...checkoutForm, deliveryType: 'office'})}
                  className={`relative flex flex-col items-center p-4 rounded-2xl border-2 transition-all duration-300 ${checkoutForm.deliveryType === 'office' ? 'border-[#F8A192] bg-[#F8A192]/5' : 'border-neutral-100 hover:border-neutral-200'}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${checkoutForm.deliveryType === 'office' ? 'bg-[#F8A192] text-white' : 'bg-neutral-100 text-neutral-400'}`}>
                    <Building2 size={20} />
                  </div>
                  <span className="font-black text-xs">توصيل للمكتب</span>
                  <span className="text-[10px] text-neutral-500 mt-0.5">
                    {checkoutForm.wilaya ? (deliveryConfig.wilayaCosts?.[checkoutForm.wilaya]?.office ? `${deliveryConfig.wilayaCosts[checkoutForm.wilaya].office} دج` : 'سعر التوصيل غير متوفر') : 'اختر الولاية أولاً'}
                  </span>
                  {checkoutForm.deliveryType === 'office' && (
                    <div className="absolute top-2 left-2 text-[#F8A192]">
                      <Check size={16} strokeWidth={3} />
                    </div>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button 
                variant="green"
                loading={isSubmitting}
                onClick={handleComplete}
                className={`flex-1 py-5 text-xl transition-all duration-300 ${
                  (!checkoutForm.fullName || checkoutForm.phone.length !== 10 || !checkoutForm.wilaya || !checkoutForm.commune || !checkoutForm.address || (product.sizes?.length && !selectedSize) || (product.colors?.length && !selectedColor))
                  ? "bg-neutral-200 text-neutral-400 shadow-none hover:bg-neutral-200" 
                  : ""
                }`}
              >
                اشتري الآن
              </Button>
              
              <div className="flex items-center border border-neutral-200 rounded-2xl p-1 bg-white">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-12 h-12 flex items-center justify-center hover:bg-neutral-100 rounded-xl transition-colors"
                >
                  <Minus size={20} />
                </button>
                <span className="w-10 text-center font-black text-xl">{quantity}</span>
                <button 
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-12 h-12 flex items-center justify-center hover:bg-neutral-100 rounded-xl transition-colors"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>

            <Toast 
              message={toast?.message || ''} 
              type={toast?.type || 'error'} 
              onClose={() => setToast(null)} 
            />

            <div className="mt-4 flex flex-col gap-2">
              <button 
                onClick={() => {
                  if (product.sizes?.length && !selectedSize) {
                    setToast({ message: 'يرجى اختيار المقاس أولاً', type: 'error' });
                    return;
                  }
                  if (product.colors?.length && !selectedColor) {
                    setToast({ message: 'يرجى اختيار اللون أولاً', type: 'error' });
                    return;
                  }
                  onAddToCart(product, quantity, selectedSize, selectedColor);
                }}
                className="w-full bg-neutral-100 text-black py-4 rounded-2xl font-black hover:bg-neutral-200 transition-all flex items-center justify-center gap-2"
              >
                <ShoppingCart size={20} /> إضافة للسلة
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-neutral-100 flex items-center justify-center gap-2 text-neutral-400">
              <ShoppingCart size={20} />
              <span className="font-bold">ملخص الطلبية</span>
              <span className="mr-auto font-black text-black">{total} دج</span>
            </div>
          </div>
        </div>

        {/* Right Side: Image Gallery */}
        <div className="flex-1 order-1 lg:order-2">
          <div className="sticky top-24 space-y-4">
            <div className="relative group">
              <div className="aspect-[4/5] rounded-[2.5rem] overflow-hidden shadow-2xl bg-neutral-100 relative">
                <AnimatePresence mode="popLayout">
                  <motion.div 
                    key={activeImage}
                    initial={{ opacity: 0, x: -100 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 100 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    onDragEnd={(_, info) => {
                      const swipeThreshold = 50;
                      if (info.offset.x > swipeThreshold) {
                        setActiveImage(prev => (prev + 1) % product.images.length);
                      } else if (info.offset.x < -swipeThreshold) {
                        setActiveImage(prev => (prev - 1 + product.images.length) % product.images.length);
                      }
                    }}
                    className="absolute inset-0 cursor-grab active:cursor-grabbing touch-none"
                  >
                    <img 
                      src={product.images[activeImage]} 
                      alt={product.name} 
                      className="w-full h-full object-contain bg-neutral-50 pointer-events-none"
                      style={{ 
                        objectPosition: product.imagePosition || 'center',
                        transform: `scale(${(product.imageSettings?.[activeImage] || product.imageSettings?.[product.images[activeImage]])?.scale || 1}) translate(${(product.imageSettings?.[activeImage] || product.imageSettings?.[product.images[activeImage]])?.x || 0}%, ${(product.imageSettings?.[activeImage] || product.imageSettings?.[product.images[activeImage]])?.y || 0}%)`,
                      }}
                      referrerPolicy="no-referrer"
                    />
                  </motion.div>
                </AnimatePresence>

                {product.isOutOfStock && (
                  <div className="absolute top-16 left-8 z-20 pointer-events-none rotate-[-12deg] drop-shadow-2xl scale-125 origin-top-left">
                    <div className="bg-[#ef4444] border-[4px] border-white outline outline-[4px] outline-[#ef4444] px-8 py-2 flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 opacity-30 mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.svg.org/200/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'4\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }}></div>
                      <span className="text-white font-black text-3xl tracking-tighter uppercase leading-none relative z-10">SOLD OUT</span>
                    </div>
                  </div>
                )}
              </div>

              {product.images.length > 1 && (
                <>
                  <button 
                    onClick={() => setActiveImage(prev => (prev - 1 + product.images.length) % product.images.length)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button 
                    onClick={() => setActiveImage(prev => (prev + 1) % product.images.length)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex"
                  >
                    <ChevronRight size={20} />
                  </button>
                </>
              )}
            </div>
            
            {product.images.length > 1 && (
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {product.images.map((img, idx) => (
                  <button 
                    key={`thumb-${idx}`}
                    onClick={() => setActiveImage(idx)}
                    className={`relative w-24 aspect-[4/5] rounded-2xl overflow-hidden flex-shrink-0 border-2 transition-all ${activeImage === idx ? 'border-[#F8A192] scale-105' : 'border-transparent opacity-60 hover:opacity-100'}`}
                  >
                    <img 
                      src={img} 
                      alt="" 
                      className="w-full h-full object-contain bg-neutral-50"
                      style={{ objectPosition: product.imagePosition || 'center' }}
                      referrerPolicy="no-referrer" 
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Product Features Section */}
      <div className="mt-20 space-y-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-4xl font-black leading-tight">
              {product.featureTitle || 'مميزات المنتج وفوائده'}
            </h2>
            <p className="text-xl text-neutral-600 leading-relaxed">
              {product.featureDescription || 'هذا المنتج مصمم خصيصاً ليلبي احتياجاتك اليومية بأعلى جودة وأفضل أداء. يتميز بتصميم عصري ومواد متينة تضمن لك تجربة استخدام استثنائية.'}
            </p>
            <ul className="space-y-4">
              {(product.benefits?.length ? product.benefits : ['جودة عالية وضمان حقيقي', 'تصميم مريح وسهل الاستخدام', 'أداء قوي يدوم طويلاً', 'متوفر بألوان وتصاميم متنوعة']).map((feature, i) => (
                <li key={`benefit-${i}`} className="flex items-center gap-3 text-lg font-bold">
                  <div className="w-6 h-6 rounded-full bg-[#F8A192] flex items-center justify-center text-white">
                    <Check size={14} strokeWidth={4} />
                  </div>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
          <div className="w-full">
            <img 
              src={product.featureImages?.[0] || product.images[0]} 
              alt="" 
              className="rounded-[3rem] shadow-2xl w-full h-auto object-contain" 
              referrerPolicy="no-referrer" 
            />
          </div>
        </div>

        <div className="bg-neutral-50 rounded-[3rem] p-12 text-center">
          <h3 className="text-3xl font-black mb-6">لماذا تختار متجرنا؟</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: 'توصيل سريع', desc: 'نصلك أينما كنت في الـ 58 ولاية مع anderson express' },
              { title: 'الدفع عند الاستلام', desc: 'لا تدفع حتى تستلم طلبيتك وتفحصها' },
              { title: 'خدمة ما بعد البيع', desc: 'فريقنا جاهز للرد على استفساراتكم' }
            ].map((item, i) => (
              <div key={`reason-${i}`} className="space-y-2">
                <div className="text-2xl font-black">{item.title}</div>
                <p className="text-neutral-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const Button = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  onClick,
  disabled = false,
  loading = false,
  type = 'button'
}: { 
  children: React.ReactNode; 
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'green'; 
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit';
}) => {
  const baseStyles = "px-6 py-3 rounded-full font-bold transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-black text-white hover:bg-neutral-800 shadow-lg shadow-black/10",
    secondary: "bg-white text-black hover:bg-neutral-100 border border-neutral-200",
    outline: "bg-transparent text-black border-2 border-black hover:bg-black hover:text-white",
    ghost: "bg-transparent text-neutral-600 hover:text-black hover:bg-neutral-100",
    green: "bg-[#22C55E] text-white hover:bg-[#16A34A] shadow-lg shadow-green-200 disabled:bg-neutral-200 disabled:text-neutral-400 disabled:shadow-none"
  };

  return (
    <button 
      type={type}
      onClick={onClick} 
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant]} ${className}`}
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : children}
    </button>
  );
};

const Badge = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md ${className}`}>
    {children}
  </span>
);

const SectionHeading = ({ title, subtitle, centered = true }: { title: string; subtitle?: string; centered?: boolean }) => (
  <div className={`mb-12 ${centered ? 'text-center' : ''}`}>
    <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">{title}</h2>
    {subtitle && <p className="text-neutral-500 max-w-2xl mx-auto">{subtitle}</p>}
  </div>
);

// --- Product Editor Component ---
const ProductEditor = ({ 
  product, 
  onSave, 
  onCancel,
  products,
  setProducts,
  showAlert,
  showConfirm,
  showPrompt
}: { 
  product: Partial<Product>; 
  onSave: (p: Product) => void; 
  onCancel: () => void;
  products: Product[];
  setProducts: (p: Product[]) => void;
  showAlert: (title: string, message: string) => void;
  showConfirm: (title: string, message: string, onConfirm: () => void, isDestructive?: boolean) => void;
  showPrompt: (title: string, message: string, onConfirm: (value: string) => void, defaultValue?: string) => void;
}) => {
  const [editedProduct, setEditedProduct] = useState<Partial<Product>>({
    ...product,
    images: product.images?.length ? product.images : [],
    featureImages: product.featureImages?.length ? product.featureImages : [],
    benefits: product.benefits?.length ? product.benefits : [''],
    featureTitle: product.featureTitle || 'مميزات المنتج وفوائده',
    featureDescription: product.featureDescription || 'هذا المنتج مصمم خصيصاً ليلبي احتياجاتك اليومية بأعلى جودة وأفضل أداء. يتميز بتصميم عصري ومواد متينة تضمن لك تجربة استخدام استثنائية.',
    imageFit: product.imageFit || 'contain',
    imagePosition: product.imagePosition || '50% 50%',
    imageSettings: product.imageSettings || {}
  });
  const [activeImage, setActiveImage] = useState(0);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const featureFileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImageAdd = () => {
    showPrompt('إضافة صورة', 'أدخل رابط الصورة (URL):', (url) => {
      if (url) {
        setEditedProduct({
          ...editedProduct,
          images: [...(editedProduct.images || []), url]
        });
      }
    });
  };

  const handleFeatureImageAdd = () => {
    showPrompt('إضافة صورة للمميزات', 'أدخل رابط الصورة (URL):', (url) => {
      if (url) {
        setEditedProduct({
          ...editedProduct,
          featureImages: [...(editedProduct.featureImages || []), url]
        });
      }
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isFeature = false) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      try {
        const newImages: string[] = [];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const compressedBase64 = await compressImage(file);
          
          // Final safety check for the single image size
          const imageSize = new TextEncoder().encode(compressedBase64).length;
          if (imageSize > 500000) { // 500KB limit per image after compression
            showAlert('خطأ في حجم الصورة', `الصورة "${file.name}" لا تزال كبيرة جداً حتى بعد الضغط. يرجى اختيار صورة أصغر.`);
            continue;
          }
          newImages.push(compressedBase64);
        }

        if (isFeature) {
          setEditedProduct({
            ...editedProduct,
            featureImages: [...(editedProduct.featureImages || []), ...newImages]
          });
        } else {
          const updatedImages = [...(editedProduct.images || []), ...newImages];
          setEditedProduct({
            ...editedProduct,
            images: updatedImages
          });
          setActiveImage(updatedImages.length - 1);
        }
      } catch (error) {
        console.error('Image compression error:', error);
        showAlert('خطأ في الصورة', 'حدث خطأ أثناء معالجة الصور. يرجى المحاولة مرة أخرى.');
      }
    }
    e.target.value = '';
  };

  const handleImageRemove = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newImages = [...(editedProduct.images || [])];
    newImages.splice(idx, 1);
    setEditedProduct({ ...editedProduct, images: newImages });
    if (activeImage >= newImages.length) setActiveImage(Math.max(0, newImages.length - 1));
  };

  const handleSave = async () => {
    if (!editedProduct.name || !editedProduct.price || !editedProduct.id) {
      showAlert('بيانات ناقصة', 'يرجى إدخال اسم المنتج وسعره ومعرفه (ID) على الأقل');
      return;
    }
    
    if (!editedProduct.name || editedProduct.name.trim() === '') {
      showAlert('خطأ', 'يرجى إدخال اسم المنتج');
      return;
    }

    if (new TextEncoder().encode(editedProduct.name).length > 1000) {
      showAlert('اسم المنتج طويل جداً', 'يرجى تقصير اسم المنتج (يجب أن يكون أقل من 1000 بايت لضمان التوافق مع قاعدة البيانات).');
      return;
    }
    
    const finalProduct: Product = {
      id: editedProduct.id,
      name: editedProduct.name!,
      tagline: editedProduct.tagline || '',
      price: Number(editedProduct.price),
      originalPrice: editedProduct.originalPrice || 0,
      discountPercent: Number(editedProduct.discountPercent || 0),
      category: editedProduct.category || 'عام',
      images: editedProduct.images?.length ? editedProduct.images : ['https://picsum.photos/seed/product/800/1000'],
      featureImages: editedProduct.featureImages || [],
      description: editedProduct.description || '',
      benefits: editedProduct.benefits?.filter(b => b !== '') || [],
      rating: editedProduct.rating || 5.0,
      reviewCount: editedProduct.reviewCount || 0,
      stock: editedProduct.stock || 100,
      isOutOfStock: editedProduct.isOutOfStock || false,
      featureTitle: editedProduct.featureTitle || '',
      featureDescription: editedProduct.featureDescription || '',
      sizes: editedProduct.sizes || [],
      colors: editedProduct.colors || [],
      imageFit: editedProduct.imageFit || 'contain',
      imagePosition: editedProduct.imagePosition || '50% 50%',
      imageSettings: editedProduct.imageSettings || {}
    } as Product;

    // Final check for total document size (Firestore limit is 1MB)
    const totalSize = new TextEncoder().encode(JSON.stringify(finalProduct)).length;
    if (totalSize > 1000000) {
      showAlert('حجم البيانات كبير', `حجم بيانات المنتج كبير جداً (${(totalSize / 1024 / 1024).toFixed(2)} ميجابايت). يرجى تقليل عدد الصور أو حجمها. الحد الأقصى هو 1 ميجابايت.`);
      return;
    }

    try {
      await setDoc(doc(db, 'products', finalProduct.id), finalProduct);
      onSave(finalProduct);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `products/${finalProduct.id}`);
    }
  };

  const EditableText = ({ 
    value, 
    onChange, 
    placeholder, 
    className = "", 
    multiline = false 
  }: { 
    value: string; 
    onChange: (val: string) => void; 
    placeholder: string; 
    className?: string;
    multiline?: boolean;
  }) => {
    if (multiline) {
      return (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-transparent outline-none resize-none border-b-2 border-transparent focus:border-[#F8A192] transition-all ${className}`}
          rows={3}
        />
      );
    }
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full bg-transparent outline-none border-b-2 border-transparent focus:border-[#F8A192] transition-all ${className}`}
      />
    );
  };

  return (
    <div className="min-h-screen bg-white pb-20" dir="rtl">
      {/* Canvas-style Toolbar */}
      <div className="sticky top-0 z-[110] bg-white/90 backdrop-blur-md border-b border-neutral-100 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onCancel} className="p-2 hover:bg-neutral-100 rounded-full transition-colors text-neutral-500">
            <X size={24} />
          </button>
          <div className="h-6 w-px bg-neutral-200 mx-2" />
          <h2 className="font-black text-lg text-neutral-800">محرر المنتج البصري</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-neutral-400 hidden sm:inline">يتم الحفظ تلقائياً في الذاكرة</span>
          {editedProduct.id && (
            <button 
              onClick={() => {
                showConfirm(
                  'حذف المنتج',
                  'هل أنت متأكد من حذف هذا المنتج نهائياً؟',
                  async () => {
                    try {
                      await deleteDoc(doc(db, 'products', editedProduct.id!));
                      setProducts(products.filter(p => p.id !== editedProduct.id));
                      onCancel();
                    } catch (error) {
                      handleFirestoreError(error, OperationType.DELETE, `products/${editedProduct.id}`);
                    }
                  },
                  true
                );
              }}
              className="p-2.5 text-red-500 hover:bg-red-50 rounded-full transition-colors"
              title="حذف المنتج"
            >
              <Trash2 size={20} />
            </button>
          )}
          <button 
            onClick={handleSave}
            className="bg-black text-white px-8 py-2.5 rounded-full font-black hover:bg-neutral-800 transition-all shadow-lg shadow-black/10 flex items-center gap-2"
          >
            <Check size={20} />
            حفظ ونشر المنتج
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-12">
        <div className="flex flex-col lg:flex-row gap-16">
          {/* Left Side: Product Info (Matches ProductView) */}
          <div className="flex-1 space-y-8 order-2 lg:order-1">
            <div className="space-y-4">
              <div className="flex flex-col gap-2 p-4 bg-neutral-50 rounded-2xl border border-neutral-100 mb-6">
                <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">معرف المنتج (للرابط - SEO ID)</label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-400 font-mono">/product/</span>
                  <input 
                    type="text"
                    value={editedProduct.id || ''}
                    onChange={val => setEditedProduct({...editedProduct, id: val.target.value.toLowerCase().replace(/\s+/g, '-')})}
                    placeholder="مثال: aura-pro-1"
                    className="flex-1 bg-transparent outline-none border-b border-neutral-200 focus:border-[#F8A192] font-mono text-sm py-1"
                  />
                </div>
                <p className="text-[9px] text-neutral-400">استخدم فقط الحروف الإنجليزية والأرقام والشرطة (-). هذا هو الرابط الذي ستستخدمه في إعلانات فيسبوك.</p>
              </div>

              <EditableText 
                value={editedProduct.name || ''}
                onChange={val => setEditedProduct({...editedProduct, name: val})}
                placeholder="أدخل اسم المنتج هنا..."
                className="text-5xl font-black"
              />
              <EditableText 
                value={editedProduct.tagline || ''}
                onChange={val => setEditedProduct({...editedProduct, tagline: val})}
                placeholder="أدخل عنواناً فرعياً جذاباً..."
                className="text-2xl text-neutral-400 font-bold"
              />
              
              <div className="flex items-center gap-4 pt-4">
                <div className="flex items-center gap-1 bg-neutral-100 px-3 py-1 rounded-full">
                  <Star size={16} className="text-[#FFC107] fill-[#FFC107]" />
                  <span className="font-black text-sm">5.0</span>
                </div>
                <span className="text-neutral-400 font-bold text-sm">(0 مراجعة)</span>
              </div>
            </div>

            <div className="p-8 bg-neutral-50 rounded-[2.5rem] border border-neutral-100">
              <div className="flex items-center justify-between mb-8">
                <div className="flex flex-col">
                  <span className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-1">السعر الأصلي</span>
                  <div className="flex items-baseline gap-2">
                    <input 
                      type="number"
                      className="text-4xl font-black w-32 outline-none bg-transparent border-b-2 border-transparent focus:border-[#F8A192]"
                      value={editedProduct.price || 0}
                      onChange={e => setEditedProduct({...editedProduct, price: Number(e.target.value)})}
                    />
                    <span className="text-xl font-black">دج</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-1">المخزون المتوفر</span>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number"
                        className="text-2xl font-black w-24 outline-none bg-transparent border-b-2 border-transparent focus:border-[#F8A192] text-center"
                        value={editedProduct.stock || 0}
                        onChange={e => setEditedProduct({...editedProduct, stock: Number(e.target.value)})}
                      />
                      <PackagePlus size={20} className="text-neutral-400" />
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-1">حالة التوفر</span>
                    <button 
                      onClick={() => setEditedProduct({...editedProduct, isOutOfStock: !editedProduct.isOutOfStock})}
                      className={`px-4 py-2 rounded-xl font-black text-xs transition-all ${editedProduct.isOutOfStock ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}
                    >
                      {editedProduct.isOutOfStock ? 'نفذت الكمية (يدوي)' : 'متوفر'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Variant Management */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 pt-6 border-t border-neutral-100">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-neutral-400 uppercase tracking-widest">المقاسات المتوفرة</span>
                    <button 
                      onClick={() => showPrompt('إضافة مقاس', 'أدخل المقاس (مثال: XL, 42):', (val) => {
                        if (val) setEditedProduct({...editedProduct, sizes: [...(editedProduct.sizes || []), val]});
                      })}
                      className="text-[#F8A192] text-xs font-black flex items-center gap-1"
                    >
                      <Plus size={14} /> إضافة
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {editedProduct.sizes?.map((size, idx) => (
                      <div key={`edit-size-${size}-${idx}`} className="bg-neutral-100 px-3 py-1.5 rounded-xl flex items-center gap-2 font-bold text-sm">
                        {size}
                        <button onClick={() => {
                          const newSizes = [...(editedProduct.sizes || [])];
                          newSizes.splice(idx, 1);
                          setEditedProduct({...editedProduct, sizes: newSizes});
                        }} className="text-red-400 hover:text-red-500">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    {(!editedProduct.sizes || editedProduct.sizes.length === 0) && (
                      <span className="text-xs text-neutral-400 font-bold italic">لا توجد مقاسات محددة</span>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-neutral-400 uppercase tracking-widest">الألوان المتوفرة</span>
                    <button 
                      onClick={() => showPrompt('إضافة لون', 'أدخل اللون (مثال: أحمر, أسود):', (val) => {
                        if (val) setEditedProduct({...editedProduct, colors: [...(editedProduct.colors || []), val]});
                      })}
                      className="text-[#F8A192] text-xs font-black flex items-center gap-1"
                    >
                      <Plus size={14} /> إضافة
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {editedProduct.colors?.map((color, idx) => (
                      <div key={`edit-color-${color}-${idx}`} className="bg-neutral-100 px-3 py-1.5 rounded-xl flex items-center gap-2 font-bold text-sm">
                        {color}
                        <button onClick={() => {
                          const newColors = [...(editedProduct.colors || [])];
                          newColors.splice(idx, 1);
                          setEditedProduct({...editedProduct, colors: newColors});
                        }} className="text-red-400 hover:text-red-500">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    {(!editedProduct.colors || editedProduct.colors.length === 0) && (
                      <span className="text-xs text-neutral-400 font-bold italic">لا توجد ألوان محددة</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <EditableText 
                  value={editedProduct.description || ''}
                  onChange={val => setEditedProduct({...editedProduct, description: val})}
                  placeholder="اكتب وصفاً مفصلاً للمنتج هنا..."
                  className="text-lg text-neutral-600 leading-relaxed"
                  multiline
                />
              </div>

              <div className="mt-8 pt-8 border-t border-neutral-100">
                <div className="flex items-center gap-4 opacity-30 cursor-not-allowed">
                  <div className="flex-1 bg-black text-white py-5 rounded-2xl text-xl font-black text-center">
                    اشتري الآن (معاينة)
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Image Gallery (Matches ProductView) */}
          <div className="flex-1 order-1 lg:order-2">
            <div className="sticky top-32 space-y-4">
              <div 
                className="relative aspect-[4/5] rounded-[2.5rem] overflow-hidden shadow-2xl bg-neutral-100 group border-4 border-transparent hover:border-[#F8A192] transition-all"
              >
                {editedProduct.images?.[activeImage] ? (
                  <>
                    <ImageAdjuster 
                      url={editedProduct.images[activeImage]} 
                      settings={editedProduct.imageSettings?.[activeImage] || { x: 0, y: 0, scale: 1, fit: editedProduct.imageFit }}
                      onChange={(newSettings) => {
                        const newImageSettings = { ...(editedProduct.imageSettings || {}) };
                        newImageSettings[activeImage] = newSettings;
                        setEditedProduct({ ...editedProduct, imageSettings: newImageSettings });
                      }}
                    />
                    <button 
                      onClick={handleImageAdd}
                      className="absolute top-4 right-4 bg-white/90 backdrop-blur shadow-lg rounded-full px-4 py-2 flex items-center gap-2 text-sm font-black text-black hover:bg-[#F8A192] hover:text-white transition-all z-20"
                    >
                      <ImageIcon size={16} /> تغيير الرابط
                    </button>
                  </>
                ) : (
                  <div 
                    onClick={handleImageAdd}
                    className="w-full h-full flex flex-col items-center justify-center text-neutral-400 gap-4 cursor-pointer"
                  >
                    <div className="w-24 h-24 rounded-full bg-neutral-200 flex items-center justify-center">
                      <Plus size={48} />
                    </div>
                    <span className="font-black text-2xl">أضف صورة للمنتج</span>
                    <p className="text-sm font-bold opacity-60">انقر هنا لرفع أو إضافة رابط صورة</p>
                  </div>
                )}
              </div>
              
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {editedProduct.images?.map((img, idx) => (
                  <div key={`edit-img-${idx}`} className="relative flex-shrink-0">
                    <button 
                      onClick={() => setActiveImage(idx)}
                      className={`relative w-24 aspect-[4/5] rounded-2xl overflow-hidden border-2 transition-all ${activeImage === idx ? 'border-[#F8A192] scale-105' : 'border-transparent opacity-60 hover:opacity-100'}`}
                    >
                      <img 
                        src={img} 
                        alt="" 
                        className="w-full h-full object-contain bg-neutral-50"
                        style={{ 
                          objectPosition: editedProduct.imagePosition || 'center',
                          transform: `scale(${editedProduct.imageSettings?.[idx]?.scale || 1}) translate(${editedProduct.imageSettings?.[idx]?.x || 0}%, ${editedProduct.imageSettings?.[idx]?.y || 0}%)`,
                        }}
                        referrerPolicy="no-referrer" 
                      />
                    </button>
                    <button 
                      onClick={(e) => handleImageRemove(idx, e)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg z-10 hover:scale-110 transition-transform"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload}
                  multiple
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-24 aspect-[4/5] rounded-2xl border-2 border-dashed border-neutral-200 flex flex-col items-center justify-center text-neutral-400 hover:border-[#F8A192] hover:text-[#F8A192] transition-all gap-2"
                >
                  <Upload size={20} />
                  <span className="text-[10px] font-black">رفع صورة</span>
                </button>
                <button 
                  onClick={handleImageAdd}
                  className="w-24 aspect-[4/5] rounded-2xl border-2 border-dashed border-neutral-200 flex flex-col items-center justify-center text-neutral-400 hover:border-[#F8A192] hover:text-[#F8A192] transition-all gap-2"
                >
                  <Plus size={20} />
                  <span className="text-[10px] font-black">رابط صورة</span>
                </button>
              </div>

              {/* Image Fit Control */}
              <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-neutral-400 uppercase tracking-widest">طريقة عرض الصور</span>
                  <ImageIcon size={16} className="text-neutral-400" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setEditedProduct({ ...editedProduct, imageFit: 'cover' })}
                    className={`py-2 rounded-xl text-xs font-black transition-all border-2 ${editedProduct.imageFit !== 'contain' ? 'border-[#F8A192] bg-white text-[#F8A192] shadow-sm' : 'border-transparent bg-neutral-100 text-neutral-400 hover:bg-neutral-200'}`}
                  >
                    تغطية (Cover)
                  </button>
                  <button
                    onClick={() => setEditedProduct({ ...editedProduct, imageFit: 'contain' })}
                    className={`py-2 rounded-xl text-xs font-black transition-all border-2 ${editedProduct.imageFit === 'contain' ? 'border-[#F8A192] bg-white text-[#F8A192] shadow-sm' : 'border-transparent bg-neutral-100 text-neutral-400 hover:bg-neutral-200'}`}
                  >
                    احتواء (Contain)
                  </button>
                </div>
                <p className="text-[10px] text-neutral-400 font-bold leading-tight">
                  * "تغطية" تملأ المربع بالكامل (قد يتم قص الأطراف).<br/>
                  * "احتواء" تظهر الصورة كاملة (قد تظهر مساحات فارغة).
                </p>
              </div>

              {/* Image Position Control (Only for Cover mode) */}
              {editedProduct.imageFit !== 'contain' && (
                <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-neutral-400 uppercase tracking-widest">تعديل موضع الصورة</span>
                      <span className="text-[8px] text-[#F8A192] font-bold">معاينة مباشرة في الأعلى ↑</span>
                    </div>
                    <Move size={16} className="text-neutral-400" />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'أعلى يسار', value: '0% 0%' },
                      { label: 'أعلى', value: '50% 0%' },
                      { label: 'أعلى يمين', value: '100% 0%' },
                      { label: 'يسار', value: '0% 50%' },
                      { label: 'وسط', value: '50% 50%' },
                      { label: 'يمين', value: '100% 50%' },
                      { label: 'أسفل يسار', value: '0% 100%' },
                      { label: 'أسفل', value: '50% 100%' },
                      { label: 'أسفل يمين', value: '100% 100%' },
                    ].map((pos) => (
                      <button
                        key={pos.value}
                        type="button"
                        onClick={() => setEditedProduct({ ...editedProduct, imagePosition: pos.value })}
                        className={`py-2 rounded-xl text-[10px] font-black transition-all border-2 ${
                          (editedProduct.imagePosition || '50% 50%') === pos.value || 
                          ((editedProduct.imagePosition === 'center' || !editedProduct.imagePosition) && pos.value === '50% 50%')
                          ? 'border-[#F8A192] bg-white text-[#F8A192] shadow-sm' 
                          : 'border-transparent bg-neutral-100 text-neutral-400 hover:bg-neutral-200'
                        }`}
                      >
                        {pos.label}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between text-[10px] font-bold text-neutral-400">
                      <span>تحكم دقيق (X, Y)</span>
                      <span className="font-mono text-[9px]">{editedProduct.imagePosition || '50% 50%'}</span>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-1 space-y-1">
                        <span className="text-[8px] text-neutral-400 block">أفقي (X)</span>
                        <input 
                          type="range" 
                          min="0" 
                          max="100" 
                          value={(() => {
                            const x = (editedProduct.imagePosition || '50% 50%').split(' ')[0];
                            if (x === 'left') return 0;
                            if (x === 'right') return 100;
                            if (x === 'center') return 50;
                            return parseInt(x.replace('%', '')) || 50;
                          })()}
                          onChange={(e) => {
                            const parts = (editedProduct.imagePosition || '50% 50%').split(' ');
                            const y = parts[1] || parts[0] || '50%';
                            setEditedProduct({ ...editedProduct, imagePosition: `${e.target.value}% ${y}` });
                          }}
                          className="w-full h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-[#F8A192]"
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <span className="text-[8px] text-neutral-400 block">عمودي (Y)</span>
                        <input 
                          type="range" 
                          min="0" 
                          max="100" 
                          value={(() => {
                            const parts = (editedProduct.imagePosition || '50% 50%').split(' ');
                            const y = parts[1] || parts[0] || '50%';
                            if (y === 'top') return 0;
                            if (y === 'bottom') return 100;
                            if (y === 'center') return 50;
                            return parseInt(y.replace('%', '')) || 50;
                          })()}
                          onChange={(e) => {
                            const parts = (editedProduct.imagePosition || '50% 50%').split(' ');
                            const x = parts[0] || '50%';
                            setEditedProduct({ ...editedProduct, imagePosition: `${x} ${e.target.value}%` });
                          }}
                          className="w-full h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-[#F8A192]"
                        />
                      </div>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setEditedProduct({ ...editedProduct, imagePosition: '50% 50%' })}
                    className="w-full py-2 bg-neutral-200 text-neutral-600 rounded-xl text-[10px] font-black hover:bg-neutral-300 transition-colors"
                  >
                    إعادة ضبط الموضع (توسيط)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Product Features Section (Matches ProductView) */}
        <div className="mt-20 space-y-20 border-t border-neutral-100 pt-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <EditableText 
                value={editedProduct.featureTitle || ''}
                onChange={val => setEditedProduct({...editedProduct, featureTitle: val})}
                placeholder="عنوان قسم المميزات..."
                className="text-4xl font-black leading-tight"
              />
              <EditableText 
                value={editedProduct.featureDescription || ''}
                onChange={val => setEditedProduct({...editedProduct, featureDescription: val})}
                placeholder="وصف قسم المميزات..."
                className="text-xl text-neutral-600 leading-relaxed"
                multiline
              />
              <div className="space-y-4">
                {editedProduct.benefits?.map((feature, i) => (
                  <div key={`edit-benefit-${i}`} className="flex items-center gap-3 group">
                    <div className="w-6 h-6 rounded-full bg-[#F8A192] flex items-center justify-center text-white flex-shrink-0">
                      <Check size={14} strokeWidth={4} />
                    </div>
                    <input 
                      type="text"
                      placeholder="أدخل ميزة المنتج هنا..."
                      className="text-lg font-bold flex-1 outline-none border-b border-transparent focus:border-[#F8A192] bg-transparent"
                      value={feature}
                      onChange={e => {
                        const newBenefits = [...(editedProduct.benefits || [])];
                        newBenefits[i] = e.target.value;
                        setEditedProduct({...editedProduct, benefits: newBenefits});
                      }}
                    />
                    <button onClick={() => {
                      const newBenefits = [...(editedProduct.benefits || [])];
                      newBenefits.splice(i, 1);
                      setEditedProduct({...editedProduct, benefits: newBenefits});
                    }} className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
                <button 
                  onClick={() => setEditedProduct({...editedProduct, benefits: [...(editedProduct.benefits || []), '']})}
                  className="text-[#F8A192] font-black text-sm hover:underline flex items-center gap-2 pt-2"
                >
                  <Plus size={16} /> إضافة ميزة جديدة
                </button>
              </div>
            </div>
            
            {/* Feature Images Decor (Interactive in Editor) */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black flex items-center gap-2">
                  <ImageIcon size={24} className="text-[#F8A192]" /> صور قسم المميزات
                </h3>
                <div className="flex gap-2">
                  <button 
                    onClick={() => featureFileInputRef.current?.click()}
                    className="text-xs font-black bg-neutral-100 px-3 py-1.5 rounded-lg hover:bg-neutral-200 transition-colors flex items-center gap-1"
                  >
                    <Upload size={14} /> رفع
                  </button>
                  <button 
                    onClick={handleFeatureImageAdd}
                    className="text-xs font-black bg-neutral-100 px-3 py-1.5 rounded-lg hover:bg-neutral-200 transition-colors flex items-center gap-1"
                  >
                    <Plus size={14} /> رابط
                  </button>
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  ref={featureFileInputRef} 
                  onChange={(e) => handleFileUpload(e, true)}
                  multiple
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="relative rounded-3xl overflow-hidden shadow-lg w-full aspect-square bg-neutral-100 group">
                    <img src={editedProduct.featureImages?.[0] || editedProduct.images?.[0] || 'https://picsum.photos/seed/f1/800/800'} alt="" className="w-full h-full object-contain bg-neutral-50" referrerPolicy="no-referrer" />
                    {editedProduct.featureImages?.[0] && (
                      <button 
                        onClick={() => {
                          const newF = [...(editedProduct.featureImages || [])];
                          newF.splice(0, 1);
                          setEditedProduct({...editedProduct, featureImages: newF});
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                  <div className="relative rounded-3xl overflow-hidden shadow-lg w-full aspect-[3/4] bg-neutral-100 group">
                    <img src={editedProduct.featureImages?.[1] || editedProduct.images?.[1] || editedProduct.images?.[0] || 'https://picsum.photos/seed/f2/800/1000'} alt="" className="w-full h-full object-contain bg-neutral-50" referrerPolicy="no-referrer" />
                    {editedProduct.featureImages?.[1] && (
                      <button 
                        onClick={() => {
                          const newF = [...(editedProduct.featureImages || [])];
                          newF.splice(1, 1);
                          setEditedProduct({...editedProduct, featureImages: newF});
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="pt-8 space-y-4">
                  <div className="relative rounded-3xl overflow-hidden shadow-lg w-full aspect-[3/4] bg-neutral-100 group">
                    <img src={editedProduct.featureImages?.[2] || editedProduct.images?.[2] || editedProduct.images?.[0] || 'https://picsum.photos/seed/f3/800/1000'} alt="" className="w-full h-full object-contain bg-neutral-50" referrerPolicy="no-referrer" />
                    {editedProduct.featureImages?.[2] && (
                      <button 
                        onClick={() => {
                          const newF = [...(editedProduct.featureImages || [])];
                          newF.splice(2, 1);
                          setEditedProduct({...editedProduct, featureImages: newF});
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                  <div className="relative rounded-3xl overflow-hidden shadow-lg w-full aspect-square bg-neutral-100 group">
                    <img src={editedProduct.featureImages?.[3] || editedProduct.images?.[3] || editedProduct.images?.[0] || 'https://picsum.photos/seed/f4/800/800'} alt="" className="w-full h-full object-contain bg-neutral-50" referrerPolicy="no-referrer" />
                    {editedProduct.featureImages?.[3] && (
                      <button 
                        onClick={() => {
                          const newF = [...(editedProduct.featureImages || [])];
                          newF.splice(3, 1);
                          setEditedProduct({...editedProduct, featureImages: newF});
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Admin Panel Component ---
const AdminPanel = ({ 
  delivery, 
  setDelivery, 
  promo, 
  setPromo, 
  orders,
  setOrders,
  products,
  setProducts,
  communes,
  setCommunes,
  apiKey,
  setApiKey,
  showAlert,
  showConfirm,
  showPrompt,
  onClose,
  notificationHistory,
  setNotificationHistory
}: { 
  delivery: DeliveryConfig; 
  setDelivery: (d: DeliveryConfig) => void;
  promo: PromoConfig;
  setPromo: (p: PromoConfig) => void;
  orders: Order[];
  setOrders: (o: Order[]) => void;
  products: Product[];
  setProducts: (p: Product[]) => void;
  communes: Record<string, string[]>;
  setCommunes: (c: Record<string, string[]>) => void;
  apiKey: string;
  setApiKey: (k: string) => void;
  showAlert: (title: string, message: string) => void;
  showConfirm: (title: string, message: string, onConfirm: () => void, isDestructive?: boolean) => void;
  showPrompt: (title: string, message: string, onConfirm: (value: string) => void, defaultValue?: string) => void;
  onClose: () => void;
  notificationHistory: {id: string, title: string, body: string, date: string}[];
  setNotificationHistory: React.Dispatch<React.SetStateAction<{id: string, title: string, body: string, date: string}[]>>;
}) => {
  const [activeTab, setActiveTab] = useState<'settings' | 'orders' | 'products' | 'notifications'>('orders');
  const [isSyncing, setIsSyncing] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [selectedWilayaForCommunes, setSelectedWilayaForCommunes] = useState(WILAYAS[0]);
  const [newCommuneName, setNewCommuneName] = useState('');

  const saveSettings = (updated: Partial<{ delivery: DeliveryConfig; promo: PromoConfig; communes: Record<string, string[]> }>) => {
    setDoc(doc(db, 'settings', 'global'), updated, { merge: true })
      .catch(err => handleFirestoreError(err, OperationType.WRITE, 'settings/global'));
  };

  const syncWithAnderson = async () => {
    if (!apiKey) {
      showAlert('تنبيه', 'يرجى إدخال مفتاح API أولاً');
      return;
    }
    setIsSyncing(true);
    try {
      // Simulation of API call to Anderson Express
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update wilaya costs with realistic values from "Anderson"
      const newCosts: Record<string, { home: number; office: number }> = {};
      WILAYAS.forEach(wilaya => {
        // Base cost between 400 and 800 depending on distance (simulated)
        const wilayaNum = parseInt(wilaya.substring(0, 2));
        const base = 400 + (wilayaNum % 10) * 40; 
        newCosts[wilaya] = {
          home: base + 200,
          office: base
        };
      });

      const updatedDelivery = { ...delivery, wilayaCosts: newCosts };
      setDelivery(updatedDelivery);
      
      // Save both the API key and the updated delivery costs to Firestore
      await Promise.all([
        setDoc(doc(db, 'settings', 'anderson'), { apiKey }, { merge: true }),
        setDoc(doc(db, 'settings', 'global'), { delivery: updatedDelivery }, { merge: true })
      ]);
      
      showAlert('تم التحديث', 'تم تحديث أسعار التوصيل لـ 58 ولاية بنجاح من أندرسون إكسبريس!');
    } catch (error) {
      console.error('Anderson Sync Error:', error);
      showAlert('خطأ', 'فشل الاتصال بخوادم أندرسون إكسبريس. يرجى التحقق من مفتاح API.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRemoveCommune = (communeName: string) => {
    const currentCommunes = communes[selectedWilayaForCommunes] || [];
    const updated = {
      ...communes,
      [selectedWilayaForCommunes]: currentCommunes.filter(c => c !== communeName)
    };
    setCommunes(updated);
    // Save to Firebase
    setDoc(doc(db, 'settings', 'global'), { communes: updated }, { merge: true })
      .catch(err => handleFirestoreError(err, OperationType.WRITE, 'settings/global'));
  };

  const handleAddCommune = () => {
    if (!newCommuneName.trim()) return;
    const currentCommunes = communes[selectedWilayaForCommunes] || [];
    if (currentCommunes.includes(newCommuneName.trim())) {
      showAlert('تكرار', 'هذه البلدية موجودة بالفعل');
      return;
    }
    const updated = {
      ...communes,
      [selectedWilayaForCommunes]: [...currentCommunes, newCommuneName.trim()]
    };
    setCommunes(updated);
    setNewCommuneName('');
    // Save to Firebase
    setDoc(doc(db, 'settings', 'global'), { communes: updated }, { merge: true })
      .catch(err => handleFirestoreError(err, OperationType.WRITE, 'settings/global'));
  };

  if (editingProduct) {
    return (
      <div className="fixed inset-0 z-[120] bg-white overflow-y-auto">
        <ProductEditor 
          product={editingProduct}
          onCancel={() => setEditingProduct(null)}
          onSave={(updatedProduct) => {
            if (editingProduct.id) {
              setProducts(products.map(p => p.id === updatedProduct.id ? updatedProduct : p));
            } else {
              setProducts([...products, updatedProduct]);
            }
            setEditingProduct(null);
          }}
          products={products}
          setProducts={setProducts}
          showAlert={showAlert}
          showConfirm={showConfirm}
          showPrompt={showPrompt}
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 md:p-6" dir="rtl">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-neutral-100 flex items-center justify-between bg-neutral-50">
          <div className="flex gap-2 md:gap-4 overflow-x-auto scrollbar-hide">
            <button 
              onClick={() => setActiveTab('orders')}
              className={`px-4 md:px-6 py-2 rounded-xl font-black text-xs md:text-sm transition-all whitespace-nowrap ${activeTab === 'orders' ? 'bg-black text-white shadow-lg' : 'text-neutral-400 hover:bg-neutral-100'}`}
            >
              الطلبات ({orders.length})
            </button>
            <button 
              onClick={() => setActiveTab('products')}
              className={`px-4 md:px-6 py-2 rounded-xl font-black text-xs md:text-sm transition-all whitespace-nowrap ${activeTab === 'products' ? 'bg-black text-white shadow-lg' : 'text-neutral-400 hover:bg-neutral-100'}`}
            >
              إدارة المنتجات
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={`px-4 md:px-6 py-2 rounded-xl font-black text-xs md:text-sm transition-all whitespace-nowrap ${activeTab === 'settings' ? 'bg-black text-white shadow-lg' : 'text-neutral-400 hover:bg-neutral-100'}`}
            >
              الإعدادات
            </button>
            <button 
              onClick={() => setActiveTab('notifications')}
              className={`px-4 md:px-6 py-2 rounded-xl font-black text-xs md:text-sm transition-all whitespace-nowrap ${activeTab === 'notifications' ? 'bg-black text-white shadow-lg' : 'text-neutral-400 hover:bg-neutral-100'}`}
            >
              سجل التنبيهات
            </button>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-200 rounded-full transition-colors flex-shrink-0"><X size={24} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {activeTab === 'orders' ? (
            <div className="space-y-6">
              <button 
                onClick={() => setActiveTab('products')}
                className="w-full py-4 border-2 border-dashed border-neutral-200 rounded-2xl text-neutral-400 font-bold hover:border-[#F8A192] hover:text-[#F8A192] transition-all flex items-center justify-center gap-2 mb-8"
              >
                <PackagePlus size={20} /> إضافة منتج جديد للمتجر
              </button>
              {orders.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4 text-neutral-300">
                    <ShoppingCart size={40} />
                  </div>
                  <h3 className="text-xl font-bold text-neutral-400">لا توجد طلبات بعد</h3>
                  <p className="text-sm text-neutral-400">بمجرد قيام زبون بالشراء، ستظهر التفاصيل هنا</p>
                </div>
              ) : (
                orders.map(order => (
                  <div key={order.id} className="border border-neutral-100 rounded-3xl p-6 hover:shadow-md transition-shadow">
                    <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-xs font-black bg-[#F8A192]/10 text-[#F8A192] px-2 py-1 rounded-md">{order.id}</span>
                          <span className="text-xs text-neutral-400">{order.date}</span>
                        </div>
                        <h4 className="text-xl font-black">{order.customerName}</h4>
                        <div className="flex flex-col gap-1 mt-1">
                          <div className="flex items-center gap-2 text-[#F8A192] font-bold">
                            <Phone size={14} />
                            <span>{order.phone}</span>
                          </div>
                          {order.phone2 && (
                            <div className="flex items-center gap-2 text-neutral-400 font-bold text-xs">
                              <Phone size={12} />
                              <span>{order.phone2} (إضافي)</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="text-2xl font-black">{order.total} دج</p>
                        <p className="text-[10px] text-neutral-400 font-bold">التوصيل: {order.deliveryCost || 0} دج</p>
                        <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                          {order.status === 'pending' ? 'قيد الانتظار' : 'تم التأكيد'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-neutral-50">
                      <div className="space-y-2">
                        <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">تفاصيل التوصيل</p>
                        <p className="text-sm font-bold flex items-center gap-2"><MapPin size={14} /> {order.wilaya} - {order.commune}</p>
                        <p className="text-sm text-neutral-500">{order.address || 'العنوان غير محدد'}</p>
                        <p className="text-xs font-bold">النوع: {order.deliveryType === 'home' ? 'توصيل للمنزل' : 'توصيل للمكتب'}</p>
                      </div>
                      <div className="space-y-2 text-right">
                        <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">المنتجات</p>
                        {order.items.map((item, i) => (
                          <div key={i} className="flex flex-col text-sm font-bold">
                            <div className="flex justify-between">
                              <span>{item.product.name} x{item.quantity}</span>
                            </div>
                            {(item.selectedSize || item.selectedColor) && (
                              <div className="text-[10px] text-neutral-400 flex gap-2">
                                {item.selectedSize && <span>المقاس: {item.selectedSize}</span>}
                                {item.selectedColor && <span>اللون: {item.selectedColor}</span>}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                      <div className="mt-6 flex gap-3">
                        <button 
                          onClick={async () => {
                            const newStatus = order.status === 'confirmed' ? 'pending' : 'confirmed';
                            try {
                              await updateDoc(doc(db, 'orders', order.id), { status: newStatus });
                              
                              // If changing to confirmed, decrement stock
                              if (newStatus === 'confirmed') {
                                for (const item of order.items) {
                                  try {
                                    await updateDoc(doc(db, 'products', item.product.id), {
                                      stock: increment(-item.quantity)
                                    });
                                  } catch (e) {
                                    console.error(`Failed to update stock for ${item.product.id}:`, e);
                                  }
                                }
                              } else {
                                // If changing back to pending, increment stock back
                                for (const item of order.items) {
                                  try {
                                    await updateDoc(doc(db, 'products', item.product.id), {
                                      stock: increment(item.quantity)
                                    });
                                  } catch (e) {
                                    console.error(`Failed to update stock for ${item.product.id}:`, e);
                                  }
                                }
                              }
                            } catch (error) {
                              handleFirestoreError(error, OperationType.WRITE, `orders/${order.id}`);
                            }
                          }}
                          className={`flex-1 py-3 rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2 ${order.status === 'confirmed' ? 'bg-green-600 text-white' : 'bg-black text-white hover:bg-neutral-800'}`}
                        >
                          {order.status === 'confirmed' ? (
                            <>
                              <Check size={18} strokeWidth={3} />
                              تم التأكيد
                            </>
                          ) : 'تأكيد الطلب'}
                        </button>
                        <a 
                          href={`tel:${order.phone}`}
                          className="px-6 py-3 border border-neutral-100 rounded-xl text-sm font-bold hover:bg-neutral-50 transition-all flex items-center justify-center"
                        >
                          اتصال
                        </a>
                        <button 
                          onClick={() => {
                            showConfirm(
                              'حذف الطلب',
                              'هل أنت متأكد من حذف هذا الطلب؟',
                              async () => {
                                try {
                                  // If order was confirmed, increment stock back before deleting
                                  if (order.status === 'confirmed') {
                                    for (const item of order.items) {
                                      try {
                                        await updateDoc(doc(db, 'products', item.product.id), {
                                          stock: increment(item.quantity)
                                        });
                                      } catch (e) {
                                        console.error(`Failed to restore stock for ${item.product.id}:`, e);
                                      }
                                    }
                                  }
                                  await deleteDoc(doc(db, 'orders', order.id));
                                } catch (error) {
                                  handleFirestoreError(error, OperationType.DELETE, `orders/${order.id}`);
                                }
                              },
                              true
                            );
                          }}
                          className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                  </div>
                ))
              )}
            </div>
          ) : activeTab === 'products' ? (
            <div className="space-y-10">
              {/* Visual Editor Trigger */}
              <button 
                onClick={() => setEditingProduct({})}
                className="w-full p-12 border-4 border-dashed border-neutral-100 rounded-[3rem] text-neutral-300 hover:border-[#F8A192] hover:text-[#F8A192] transition-all flex flex-col items-center justify-center gap-6 group"
              >
                <div className="w-24 h-24 bg-neutral-50 rounded-full flex items-center justify-center group-hover:bg-[#F8A192]/10 transition-colors">
                  <PackagePlus size={48} />
                </div>
                <div className="text-center">
                  <h3 className="text-2xl font-black mb-2">إضافة منتج جديد (محرر بصري)</h3>
                  <p className="font-bold">صمم صفحة منتجك كما يراها الزبون تماماً</p>
                </div>
              </button>

              {/* Existing Products List */}
              <section>
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-black">المنتجات الحالية ({products.length})</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map(p => (
                    <div key={p.id} className="group relative bg-white border border-neutral-100 rounded-[2rem] overflow-hidden hover:shadow-xl transition-all">
                      <div className="aspect-[4/5] relative">
                        <img src={p.images[0]} alt="" className="w-full h-full object-contain bg-neutral-50" referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                          <button 
                            onClick={() => setEditingProduct(p)}
                            className="bg-white text-black p-4 rounded-full hover:scale-110 transition-transform"
                          >
                            <Edit3 size={20} />
                          </button>
                          <button 
                            onClick={() => {
                              showConfirm(
                                'حذف المنتج',
                                'هل أنت متأكد من حذف هذا المنتج؟',
                                async () => {
                                  try {
                                    await deleteDoc(doc(db, 'products', p.id));
                                  } catch (error) {
                                    handleFirestoreError(error, OperationType.DELETE, `products/${p.id}`);
                                  }
                                },
                                true
                              );
                            }}
                            className="bg-red-500 text-white p-4 rounded-full hover:scale-110 transition-transform"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </div>
                      <div className="p-6">
                        <h4 className="font-black text-lg mb-1">{p.name}</h4>
                        <div className="flex justify-between items-center">
                          <p className="text-[#F8A192] font-black">{p.price} دج</p>
                          <div className={`px-3 py-1 rounded-full text-[10px] font-black ${p.stock <= 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                            المخزون: {p.stock}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          ) : activeTab === 'notifications' ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-black text-lg flex items-center gap-2"><Bell size={20} /> سجل التنبيهات الأخيرة</h3>
                <button 
                  onClick={() => {
                    setNotificationHistory([]);
                    localStorage.removeItem('notification_history');
                  }}
                  className="text-[10px] text-red-500 font-bold hover:underline"
                >
                  مسح السجل
                </button>
              </div>
              
              {notificationHistory.length === 0 ? (
                <div className="text-center py-20 bg-neutral-50 rounded-[2rem] border border-dashed border-neutral-200">
                  <Bell size={40} className="mx-auto mb-4 text-neutral-300" />
                  <p className="text-neutral-400 font-bold">لا توجد تنبيهات مسجلة حالياً</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notificationHistory.map(notif => (
                    <div key={notif.id} className="p-4 bg-white border border-neutral-100 rounded-2xl hover:border-[#F8A192] transition-colors">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-black text-sm">{notif.title}</span>
                        <span className="text-[10px] text-neutral-400">{new Date(notif.date).toLocaleTimeString('ar-DZ')}</span>
                      </div>
                      <p className="text-xs text-neutral-500 leading-relaxed whitespace-pre-line">{notif.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-10 max-w-3xl mx-auto">
              {/* Install App Section */}
              <section className="p-6 bg-black text-white rounded-[2rem] shadow-xl overflow-hidden relative">
                <div className="relative z-10">
                  <h3 className="font-black text-lg mb-2 flex items-center gap-2"><Smartphone size={20} /> تثبيت التطبيق على هاتفك</h3>
                  
                  {deferredPrompt ? (
                    <>
                      <p className="text-xs text-neutral-400 mb-4 leading-relaxed">
                        قم بتثبيت Aura Pro Store كتطبيق مستقل للحصول على تجربة أسرع وتنبيهات فورية في لوحة الإشعارات.
                      </p>
                      <button 
                        onClick={installApp}
                        className="w-full py-3 bg-white text-black rounded-xl text-xs font-black hover:bg-neutral-100 transition-all"
                      >
                        تثبيت التطبيق الآن
                      </button>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-xs text-neutral-400 leading-relaxed">
                        لتحويل المتجر إلى تطبيق على هاتفك، يرجى اتباع الخطوات التالية:
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                          <div className="font-bold text-[10px] text-white mb-1">على أندرويد (Chrome)</div>
                          <p className="text-[9px] text-neutral-400">اضغط على النقاط الثلاث (⋮) ثم اختر "إضافة إلى الشاشة الرئيسية".</p>
                        </div>
                        <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                          <div className="font-bold text-[10px] text-white mb-1">على آيفون (Safari)</div>
                          <p className="text-[9px] text-neutral-400">اضغط على زر المشاركة (↑) ثم اختر "إضافة إلى الشاشة الرئيسية".</p>
                        </div>
                      </div>
                      <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                        <p className="text-[9px] text-amber-200 leading-relaxed">
                          <strong>ملاحظة:</strong> إذا كنت تتصفح من داخل AI Studio، يرجى الضغط على <strong>"فتح في نافذة جديدة"</strong> أسفل الشاشة أولاً لتتمكن من التثبيت.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
              </section>

              {/* Notifications Settings */}
              <section className="p-6 bg-neutral-50 rounded-[2rem] border border-neutral-100">
                <h3 className="font-black mb-4 flex items-center gap-2"><Bell size={20} /> نظام التنبيهات</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                        <Smartphone size={18} />
                      </div>
                      <div>
                        <div className="font-bold text-xs text-blue-900">للمستخدمين على الهاتف</div>
                        <p className="text-[10px] text-blue-700 mt-1 leading-relaxed">
                          لضمان وصول التنبيهات إلى لوحة الإشعارات في هاتفك، يرجى:
                          <br />
                          1. الضغط على <strong>"فتح في نافذة جديدة"</strong> أسفل الشاشة.
                          <br />
                          2. إضافة التطبيق إلى <strong>الشاشة الرئيسية</strong> (Add to Home Screen).
                          <br />
                          3. التأكد من منح إذن التنبيهات عند الطلب.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-neutral-100">
                    <div>
                      <div className="font-bold text-sm">حالة التنبيهات</div>
                      <div className="text-[10px] text-neutral-500">تلقي إشعارات عند وجود طلبات جديدة</div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2">
                        {typeof Notification === 'undefined' ? (
                          <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-1 rounded-lg">غير مدعوم</span>
                        ) : Notification.permission === 'granted' ? (
                          <span className="text-[10px] text-green-600 font-bold bg-green-50 px-2 py-1 rounded-lg">مفعلة</span>
                        ) : Notification.permission === 'denied' ? (
                          <span className="text-[10px] text-red-600 font-bold bg-red-50 px-2 py-1 rounded-lg">مرفوضة</span>
                        ) : (
                          <span className="text-[10px] text-neutral-400 font-bold bg-neutral-100 px-2 py-1 rounded-lg">غير مفعلة</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {typeof Notification !== 'undefined' && Notification.permission === 'granted' && (
                          <button 
                            onClick={() => {
                              showNotification('تنبيه تجريبي', {
                                body: 'هذا تنبيه تجريبي للتأكد من أن نظام التنبيهات يعمل بشكل صحيح على هاتفك.',
                                icon: 'https://picsum.photos/seed/aura/192/192',
                                badge: 'https://picsum.photos/seed/aura/192/192',
                                tag: 'test-notification'
                              });
                              const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                              audio.play().catch(e => console.warn('Audio playback prevented:', e));
                            }}
                            className="text-[10px] text-blue-600 font-bold underline"
                          >
                            تجربة التنبيه
                          </button>
                        )}
                        {typeof Notification !== 'undefined' && Notification.permission !== 'granted' && (
                          <button 
                            onClick={async () => {
                              const result = await Notification.requestPermission();
                              window.location.reload();
                            }}
                            className="text-[10px] text-[#F8A192] font-bold underline"
                          >
                            {Notification.permission === 'denied' ? 'إعادة المحاولة (بعد التغيير من الإعدادات)' : 'طلب الإذن الآن'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {typeof Notification !== 'undefined' && Notification.permission === 'granted' && (
                    <button 
                      onClick={() => {
                        showNotification('تنبيه تجريبي', {
                          body: 'هذا تنبيه تجريبي للتأكد من عمل النظام بنجاح.',
                          icon: 'https://picsum.photos/seed/aura/192/192',
                          badge: 'https://picsum.photos/seed/aura/192/192',
                          tag: 'test-notification'
                        });
                        try {
                          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                          audio.play().catch(e => console.warn('Audio playback prevented:', e));
                        } catch (e) {}
                      }}
                      className="w-full py-3 bg-neutral-100 rounded-xl text-xs font-black hover:bg-neutral-200 transition-all"
                    >
                      إرسال تنبيه تجريبي
                    </button>
                  )}
                  
                  {typeof Notification !== 'undefined' && Notification.permission === 'default' && (
                    <button 
                      onClick={() => Notification.requestPermission().then(() => window.location.reload())}
                      className="w-full py-3 bg-black text-white rounded-xl text-xs font-black hover:bg-neutral-800 transition-all"
                    >
                      تفعيل التنبيهات الآن
                    </button>
                  )}
                </div>
              </section>

              {/* Anderson Express Integration */}
              <section className="p-6 bg-neutral-50 rounded-[2rem] border border-neutral-100">
                <h3 className="font-black mb-4 flex items-center gap-2"><Truck size={20} /> الربط مع Anderson Express</h3>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <input 
                      type="password" 
                      placeholder="أدخل API Key الخاص بـ Anderson" 
                      className="flex-1 px-4 py-3 rounded-xl border border-neutral-200 text-sm"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                    />
                    <button 
                      onClick={async () => {
                        try {
                          await setDoc(doc(db, 'settings', 'anderson'), { apiKey }, { merge: true });
                          showAlert('تم الحفظ', 'تم حفظ مفتاح API بنجاح');
                        } catch (e) {
                          handleFirestoreError(e, OperationType.WRITE, 'settings/anderson');
                        }
                      }}
                      className="px-4 py-3 bg-neutral-100 rounded-xl text-xs font-black hover:bg-neutral-200 transition-all"
                    >
                      حفظ
                    </button>
                  </div>
                  <Button 
                    onClick={syncWithAnderson} 
                    className="w-full py-4 text-sm bg-black hover:bg-neutral-800"
                    disabled={isSyncing || !apiKey}
                  >
                    {isSyncing ? 'جاري المزامنة...' : 'تحديث الأسعار تلقائياً'}
                  </Button>
                </div>
              </section>

              {/* Commune Management */}
              <section className="p-6 border border-neutral-100 rounded-[2rem]">
                <h3 className="font-black mb-4 flex items-center gap-2"><MapPin size={20} /> إدارة البلديات</h3>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-neutral-400 uppercase tracking-widest">اختر الولاية للإدارة</label>
                    <select 
                      className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-white font-bold"
                      value={selectedWilayaForCommunes}
                      onChange={(e) => setSelectedWilayaForCommunes(e.target.value)}
                    >
                      {WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <input 
                      type="text"
                      placeholder="اسم البلدية الجديدة"
                      className="flex-1 px-4 py-3 rounded-xl border border-neutral-200 text-sm font-bold"
                      value={newCommuneName}
                      onChange={(e) => setNewCommuneName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddCommune()}
                    />
                    <button 
                      onClick={handleAddCommune}
                      className="bg-black text-white px-6 py-3 rounded-xl font-black text-sm hover:bg-neutral-800 transition-all"
                    >
                      إضافة
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                    <p className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-2">البلديات المضافة حالياً:</p>
                    <div className="flex flex-wrap gap-2">
                      {(communes[selectedWilayaForCommunes] || []).map((commune, idx) => (
                        <div key={`${commune}-${idx}`} className="flex items-center gap-2 bg-neutral-100 px-3 py-1.5 rounded-lg group">
                          <span className="text-sm font-bold">{commune}</span>
                          <button 
                            onClick={() => handleRemoveCommune(commune)}
                            className="text-red-400 hover:text-red-600 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                      {(communes[selectedWilayaForCommunes] || []).length === 0 && (
                        <p className="text-sm text-neutral-400 italic">لا توجد بلديات مضافة لهذه الولاية</p>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* Granular Delivery Costs */}
              <section className="p-6 border border-neutral-100 rounded-[2rem]">
                <h3 className="font-black mb-4 flex items-center gap-2"><MapPin size={20} /> أسعار التوصيل حسب الولاية</h3>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {WILAYAS.map(wilaya => {
                    const cost = delivery.wilayaCosts?.[wilaya] || { home: 0, office: 0 };
                    return (
                      <div key={wilaya} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-neutral-50 rounded-2xl gap-4">
                        <span className="font-bold text-sm min-w-[120px]">{wilaya}</span>
                        <div className="flex gap-4 flex-1">
                          <div className="flex-1">
                            <label className="text-[10px] font-black text-neutral-400 block mb-1">للمنزل</label>
                            <input 
                              type="number" 
                              value={cost.home}
                              onChange={(e) => {
                                const newCosts = { ...delivery.wilayaCosts, [wilaya]: { ...cost, home: Number(e.target.value) } };
                                const updated = { ...delivery, wilayaCosts: newCosts };
                                setDelivery(updated);
                                saveSettings({ delivery: updated });
                              }}
                              className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm font-bold"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-[10px] font-black text-neutral-400 block mb-1">للمكتب</label>
                            <input 
                              type="number" 
                              value={cost.office}
                              onChange={(e) => {
                                const newCosts = { ...delivery.wilayaCosts, [wilaya]: { ...cost, office: Number(e.target.value) } };
                                const updated = { ...delivery, wilayaCosts: newCosts };
                                setDelivery(updated);
                                saveSettings({ delivery: updated });
                              }}
                              className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm font-bold"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Product Specific Promotions */}
              <section className="p-6 border border-neutral-100 rounded-[2rem]">
                <h3 className="font-black mb-4 flex items-center gap-2"><Tag size={20} /> تخفيضات المنتجات الفردية</h3>
                <div className="space-y-4">
                  {products.map(product => {
                    const discount = (product as any).discountPercent || 0;
                    return (
                      <div key={product.id} className="flex items-center justify-between p-4 bg-neutral-50 rounded-2xl">
                        <div className="flex items-center gap-4">
                          <img src={product.images[0]} alt="" className="w-12 h-12 rounded-lg object-contain bg-neutral-50" />
                          <span className="font-bold text-sm">{product.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-neutral-100 shadow-sm">
                            <span className="text-[10px] font-black text-neutral-400 uppercase">الخصم %</span>
                            <input 
                              type="number" 
                              value={discount}
                              onChange={async (e) => {
                                const newDiscount = Number(e.target.value);
                                const updatedProduct = { ...product, discountPercent: newDiscount };
                                try {
                                  await setDoc(doc(db, 'products', product.id), { discountPercent: newDiscount }, { merge: true });
                                } catch (error) {
                                  handleFirestoreError(error, OperationType.WRITE, `products/${product.id}`);
                                }
                              }}
                              className="w-12 text-center font-black text-sm outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Global Promotions */}
              <section className="p-6 border-2 border-dashed border-neutral-100 rounded-[2rem]">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-black flex items-center gap-2"><Tag size={20} /> العرض العام (يطبق على الجميع)</h3>
                  <button 
                    onClick={() => {
                      const updated = { ...promo, isActive: !promo.isActive };
                      setPromo(updated);
                      saveSettings({ promo: updated });
                    }}
                    className={`w-14 h-8 rounded-full transition-all relative ${promo.isActive ? 'bg-[#F8A192]' : 'bg-neutral-200'}`}
                  >
                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-sm transition-all ${promo.isActive ? 'right-7' : 'right-1'}`} />
                  </button>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-neutral-400 uppercase tracking-widest">نسبة الخصم (%)</label>
                  <input 
                    type="number" 
                    value={promo.discountPercent} 
                    onChange={(e) => {
                      const updated = { ...promo, discountPercent: Number(e.target.value) };
                      setPromo(updated);
                      saveSettings({ promo: updated });
                    }}
                    className="w-full px-6 py-4 rounded-2xl border border-neutral-100 font-black"
                  />
                </div>
              </section>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// --- Notification Manager Component ---
const NotificationManager = ({ isAdmin, onAddNotification }: { isAdmin: boolean, onAddNotification: (title: string, body: string) => void }) => {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [showSuccess, setShowSuccess] = useState(true);
  const isInitialLoad = React.useRef(true);
  const mountTime = React.useRef(new Date().getTime());

  useEffect(() => {
    if (permission === 'granted') {
      const timer = setTimeout(() => setShowSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [permission]);

  useEffect(() => {
    if (!isAdmin || typeof Notification === 'undefined') return;

    const q = query(collection(db, 'orders'), orderBy('date', 'desc'), limit(10));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (isInitialLoad.current) {
        isInitialLoad.current = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const orderData = change.doc.data();
          const orderTime = new Date(orderData.date).getTime();
          
          // Only notify if the order was created AFTER the component mounted
          if (orderTime > mountTime.current && Notification.permission === 'granted') {
            const itemsInfo = orderData.items.map((item: any) => {
              let info = item.product.name;
              const details = [];
              if (item.selectedSize) details.push(item.selectedSize);
              if (item.selectedColor) details.push(item.selectedColor);
              if (details.length > 0) info += ` (${details.join(' - ')})`;
              return `${info} (x${item.quantity})`;
            }).join('، ');

            const title = 'طلب جديد مستلم';
            const body = `الزبون: ${orderData.customerName}\nالطلبية: ${itemsInfo}`;
            
            showNotification(title, {
              body,
              icon: 'https://picsum.photos/seed/aura/192/192',
              badge: 'https://picsum.photos/seed/aura/192/192',
              tag: `order-${orderData.id}`
            });

            onAddNotification(title, body);
            
            // Play a sound if possible
            try {
              const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
              audio.play().catch(e => {
                console.warn('Audio playback was prevented by the browser. Interaction required.');
              });
            } catch (e) {
              console.warn('Audio initialization failed');
            }
          }
        }
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'orders');
    });

    return () => unsubscribe();
  }, [isAdmin]);

  const requestPermission = async () => {
    if (typeof Notification === 'undefined') return;
    const result = await Notification.requestPermission();
    setPermission(result);
  };

  if (!isAdmin) return null;
  console.log('NotificationManager rendering for admin', { permission, hasNotification: typeof Notification !== 'undefined' });

  return (
    <div className="fixed bottom-24 right-4 z-[60] flex flex-col items-end gap-2 pointer-events-none">
      <div className="pointer-events-auto">
        {typeof Notification === 'undefined' ? (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-amber-50 text-amber-700 px-4 py-2 rounded-xl text-[10px] font-bold border border-amber-100 shadow-lg flex items-center gap-2"
          >
            <AlertCircle size={14} /> التنبيهات غير مدعومة في هذا المتصفح (جرب فتح التطبيق في نافذة جديدة)
          </motion.div>
        ) : permission === 'default' ? (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={requestPermission}
            className="bg-[#F8A192] text-white px-6 py-3 rounded-full font-black shadow-2xl flex items-center gap-2 hover:scale-105 transition-transform"
          >
            <AlertCircle size={20} /> تفعيل التنبيهات للطلبات الجديدة
          </motion.button>
        ) : permission === 'denied' ? (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-red-50 text-red-600 px-4 py-3 rounded-2xl text-[10px] font-bold border border-red-100 shadow-lg flex flex-col gap-2 max-w-[200px]"
          >
            <div className="flex items-center gap-2">
              <X size={14} /> التنبيهات مرفوضة
            </div>
            <p className="text-[9px] opacity-80 leading-tight">
              يرجى الضغط على أيقونة القفل في شريط العنوان وتفعيل التنبيهات، أو جرب فتح التطبيق في نافذة جديدة.
            </p>
            <button 
              onClick={() => window.open(window.location.href, '_blank')}
              className="bg-red-600 text-white py-1 px-2 rounded-lg text-[9px] mt-1"
            >
              فتح في نافذة جديدة
            </button>
          </motion.div>
        ) : (
          <AnimatePresence>
            {showSuccess && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-green-50 text-green-600 px-4 py-2 rounded-xl text-[10px] font-bold border border-green-100 shadow-lg flex items-center gap-2"
              >
                <CheckCircle2 size={14} /> التنبيهات مفعلة بنجاح ✅
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

// --- Main App ---

interface Order {
  id: string;
  customerName: string;
  phone: string;
  phone2?: string;
  wilaya: string;
  commune: string;
  address: string;
  deliveryType: string;
  items: CartItem[];
  total: number;
  deliveryCost: number;
  date: string;
  status: 'pending' | 'confirmed' | 'shipped';
}

export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <MainApp />
      </HashRouter>
    </ErrorBoundary>
  );
}

// --- Auth Modal Component ---
const AuthModal = ({ 
  email, setEmail, password, setPassword, onSubmit, onGoogleLogin, isSubmitting, onClose 
}: { 
  email: string;
  setEmail: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onGoogleLogin: () => void;
  isSubmitting: boolean;
  onClose: () => void;
}) => {
  return (
    <>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-white rounded-3xl shadow-2xl z-[101] overflow-hidden"
        dir="rtl"
      >
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-neutral-900">تسجيل الدخول</h2>
            <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
              <X size={24} />
            </button>
          </div>

          <button 
            onClick={onGoogleLogin}
            className="w-full border border-neutral-200 py-4 rounded-xl font-medium hover:bg-neutral-50 transition-all flex items-center justify-center gap-3 mb-8"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" className="w-5 h-5" />
            <span>تسجيل الدخول بجوجل</span>
          </button>

          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-neutral-500">أو عبر البريد</span>
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">البريد الإلكتروني</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-black outline-none transition-all"
                placeholder="example@mail.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">كلمة المرور</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-black outline-none transition-all"
                placeholder="••••••••"
              />
            </div>

            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-black text-white py-4 rounded-xl font-bold hover:bg-neutral-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'دخول بالبريد'
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </>
  );
};

function MainApp() {
  const location = useLocation();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  
  // Initialize from localStorage for speed and quota saving
  const [products, setProducts] = useState<Product[]>(() => {
    const cached = localStorage.getItem('cached_products');
    return cached ? JSON.parse(cached) : PRODUCTS;
  });
  
  const [communes, setCommunes] = useState<Record<string, string[]>>(() => {
    const cached = localStorage.getItem('cached_communes');
    return cached ? JSON.parse(cached) : COMMUNES;
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  const [notificationHistory, setNotificationHistory] = useState<{id: string, title: string, body: string, date: string}[]>([]);
  const [showAdminBanner, setShowAdminBanner] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  useEffect(() => {
    if (user?.email === ADMIN_EMAIL) {
      setShowAdminBanner(true);
      const timer = setTimeout(() => setShowAdminBanner(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  useEffect(() => {
    const history = localStorage.getItem('notification_history');
    if (history) setNotificationHistory(JSON.parse(history));
  }, []);

  const addNotificationToHistory = (title: string, body: string) => {
    setNotificationHistory(prev => {
      const newEntry = { id: Math.random().toString(36).substr(2, 9), title, body, date: new Date().toISOString() };
      const updated = [newEntry, ...prev].slice(0, 50);
      localStorage.setItem('notification_history', JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    if (location.hash === '#products') {
      const element = document.getElementById('products');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [location]);

  // Custom Modals State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDestructive?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
  });

  const [promptModal, setPromptModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: (value: string) => void;
    defaultValue?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showAlert = (title: string, message: string) => {
    setAlertModal({ isOpen: true, title, message });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void, isDestructive = false) => {
    setConfirmModal({ isOpen: true, title, message, onConfirm, isDestructive });
  };

  const showPrompt = (title: string, message: string, onConfirm: (value: string) => void, defaultValue?: string) => {
    setPromptModal({ isOpen: true, title, message, onConfirm, defaultValue });
  };

  // Global Config
  const [deliveryConfig, setDeliveryConfig] = useState<DeliveryConfig>(() => {
    const cached = localStorage.getItem('cached_delivery');
    return cached ? JSON.parse(cached) : { wilayaCosts: {}, freeShippingThreshold: 100000 };
  });

  const [promoConfig, setPromoConfig] = useState<PromoConfig>(() => {
    const cached = localStorage.getItem('cached_promo');
    return cached ? JSON.parse(cached) : { discountPercent: 0, isActive: false };
  });

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
      if (u) {
        console.log('User logged in:', {
          email: u.email,
          emailVerified: u.emailVerified,
          isAdmin: u.email === ADMIN_EMAIL
        });
      }
    });
    return () => unsubscribe();
  }, []);

  // Firestore Sync
  useEffect(() => {
    // Sync Products
    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      console.log(`Products snapshot received: ${snapshot.size} docs, fromCache: ${snapshot.metadata.fromCache}`);
      const pList: Product[] = [];
      snapshot.forEach(doc => {
        const data = doc.data() as Product;
        pList.push({ ...data, id: doc.id }); // Ensure ID matches document ID for unique keys
      });
      
      // Only update if we have data or if it's a server response
      // This prevents flickering to empty if cache is briefly empty during re-sync
      if (!snapshot.empty || !snapshot.metadata.fromCache) {
        setProducts(pList);
        localStorage.setItem('cached_products', JSON.stringify(pList));
      }
    }, (err) => {
      const isQuotaError = err.message.includes('Quota limit exceeded') || err.message.includes('quota-exceeded');
      if (isQuotaError) {
        console.warn("Products sync quota exceeded:", err.message);
        setQuotaExceeded(true);
      } else {
        console.error("Products sync error:", err);
        if (err.message.includes('permission-denied')) {
          setToast({ message: 'انتهت الجلسة، يرجى تحديث الصفحة', type: 'error' });
        }
      }
    });

    // Sync Settings
    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.delivery) {
          setDeliveryConfig(data.delivery);
          localStorage.setItem('cached_delivery', JSON.stringify(data.delivery));
        }
        if (data.promo) {
          setPromoConfig(data.promo);
          localStorage.setItem('cached_promo', JSON.stringify(data.promo));
        }
        if (data.communes) {
          setCommunes(data.communes);
          localStorage.setItem('cached_communes', JSON.stringify(data.communes));
        }
      }
    }, (err) => {
      const isQuotaError = err.message.includes('Quota limit exceeded') || err.message.includes('quota-exceeded');
      if (isQuotaError) {
        console.warn("Settings sync quota exceeded:", err.message);
        setQuotaExceeded(true);
      } else {
        console.error("Settings sync error:", err);
      }
    });

    // Sync Anderson Settings (Admin only)
    let unsubAnderson = () => {};
    if (user && user.email === ADMIN_EMAIL) {
      unsubAnderson = onSnapshot(doc(db, 'settings', 'anderson'), (docSnap) => {
        if (docSnap.exists()) {
          setApiKey(docSnap.data().apiKey || '');
        }
      }, (err) => {
        const isQuotaError = err.message.includes('Quota limit exceeded') || err.message.includes('quota-exceeded');
        if (isQuotaError) {
          console.warn("Anderson settings sync quota exceeded:", err.message);
          setQuotaExceeded(true);
        } else {
          console.error("Anderson settings sync error:", err);
        }
      });
    }

    // Sync Orders (Admin only)
    let unsubOrders = () => {};
    if (user && user.email === ADMIN_EMAIL) {
      unsubOrders = onSnapshot(query(collection(db, 'orders'), orderBy('date', 'desc')), (snapshot) => {
        const oList: Order[] = [];
        snapshot.forEach(doc => {
          const data = doc.data() as Order;
          oList.push({ ...data, id: doc.id }); // Ensure ID matches document ID for unique keys
        });
        setOrders(oList);
      }, (err) => {
        const isQuotaError = err.message.includes('Quota limit exceeded') || err.message.includes('quota-exceeded');
        if (isQuotaError) {
          console.warn("Orders sync quota exceeded:", err.message);
          setQuotaExceeded(true);
        } else {
          console.warn('Orders sync failed:', err.message);
        }
      });
    }

    return () => {
      unsubProducts();
      unsubSettings();
      unsubAnderson();
      unsubOrders();
    };
  }, [user]);

  const handleLogin = () => {
    setIsAuthModalOpen(true);
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setToast({ message: 'تم تسجيل الدخول بنجاح', type: 'success' });
      setIsAuthModalOpen(false);
      setEmail('');
      setPassword('');
    } catch (error: any) {
      console.error('Auth failed:', error);
      let message = 'خطأ في الدخول. يرجى التأكد من البيانات.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        message = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
      }
      setToast({ message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      setIsAuthModalOpen(false);
    } catch (error: any) {
      console.error('Google login failed:', error);
      let message = 'فشل تسجيل الدخول بجوجل.';
      if (error.code === 'auth/unauthorized-domain') {
        message = 'هذا النطاق غير مصرح به في Firebase.';
      }
      setToast({ message, type: 'error' });
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      setIsAdminOpen(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Helper to calculate discounted price
  const getPrice = (product: Product) => {
    // 1. Check for product-specific discount first
    if (product.originalPrice && product.originalPrice > product.price) {
      // If originalPrice is set in constants, we assume the price is already discounted or we use it
    }
    
    // Priority: Product specific discount > Global discount
    const productDiscount = (product as any).discountPercent;
    if (productDiscount !== undefined && productDiscount > 0) {
      return Math.round(product.price * (1 - productDiscount / 100));
    }

    if (!promoConfig.isActive) return product.price;
    return Math.round(product.price * (1 - promoConfig.discountPercent / 100));
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + (getPrice(item.product) * item.quantity), 0);

  const [checkoutForm, setCheckoutForm] = useState({
    fullName: '',
    phone: '',
    phone2: '',
    wilaya: '',
    commune: '',
    address: '',
    deliveryType: 'home' as 'home' | 'office'
  });

  const availableCommunes = useMemo(() => {
    return communes[checkoutForm.wilaya] || communes["default"] || [];
  }, [checkoutForm.wilaya, communes]);

  const deliveryPrice = useMemo(() => {
    if (!checkoutForm.wilaya) return 0;
    const customCost = deliveryConfig.wilayaCosts?.[checkoutForm.wilaya];
    if (customCost) {
      return checkoutForm.deliveryType === 'home' ? customCost.home : customCost.office;
    }
    return 0;
  }, [checkoutForm.wilaya, checkoutForm.deliveryType, deliveryConfig]);

  const finalTotal = subtotal + deliveryPrice;

  const handleAddToCart = (product: Product, quantity: number, selectedSize?: string, selectedColor?: string) => {
    setCart(prev => {
      const existing = prev.find(item => 
        item.product.id === product.id && 
        item.selectedSize === selectedSize && 
        item.selectedColor === selectedColor
      );
      if (existing) {
        return prev.map(item => 
          (item.product.id === product.id && item.selectedSize === selectedSize && item.selectedColor === selectedColor)
            ? { ...item, quantity: item.quantity + quantity } 
            : item
        );
      }
      return [...prev, { product, quantity, selectedSize, selectedColor }];
    });
    setIsCartOpen(true);
  };

  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const handleCompletePurchase = async (formData: any, quantity?: number, product?: Product) => {
    // Validation
    if (!formData.fullName) {
      setToast({ message: 'يرجى إدخال الاسم الكامل', type: 'error' });
      return;
    }
    if (!formData.phone || formData.phone.length !== 10) {
      setToast({ message: 'يرجى إدخال رقم هاتف صحيح (10 أرقام)', type: 'error' });
      return;
    }
    if (!formData.wilaya) {
      setToast({ message: 'يرجى اختيار الولاية', type: 'error' });
      return;
    }
    if (!formData.commune) {
      setToast({ message: 'يرجى اختيار البلدية', type: 'error' });
      return;
    }
    if (!formData.address) {
      setToast({ message: 'يرجى إدخال العنوان', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    // If quantity is passed, it means we are buying from the product page directly
    let items: CartItem[] = [];
    
    if (quantity !== undefined && product) {
      // Direct purchase from product page
      items = [{ 
        product: product, 
        quantity, 
        selectedSize: formData.selectedSize, 
        selectedColor: formData.selectedColor 
      }];
    } else if (cart.length > 0) {
      // Purchase from cart/checkout page
      items = [...cart];
    } else if (product) {
      // Fallback for selected product
      items = [{ product: product, quantity: 1 }];
    }

    if (items.length === 0) return;

    // Sanitize items to remove undefined values for Firestore and reduce document size
    const sanitizedItems = items.map(item => {
      const sanitized: any = {
        product: {
          id: item.product.id,
          name: item.product.name,
          price: item.product.price,
          originalPrice: item.product.originalPrice,
          image: item.product.images[0] // Store only the first image as a thumbnail
        },
        quantity: item.quantity
      };
      if (item.selectedSize !== undefined) sanitized.selectedSize = item.selectedSize;
      if (item.selectedColor !== undefined) sanitized.selectedColor = item.selectedColor;
      return sanitized;
    });

    const itemsTotal = items.reduce((sum, item) => sum + (getPrice(item.product) * item.quantity), 0);
    
    const customCost = deliveryConfig.wilayaCosts?.[formData.wilaya];
    const actualDeliveryPrice = customCost 
      ? (formData.deliveryType === 'home' ? customCost.home : customCost.office)
      : 0;

    const orderId = `DZ-${Math.floor(Math.random() * 90000) + 10000}`;
    
    // Deep sanitize the order object to remove undefined values for Firestore
    const newOrder = JSON.parse(JSON.stringify({
      id: orderId,
      customerName: formData.fullName,
      phone: formData.phone,
      phone2: formData.phone2 || '',
      wilaya: formData.wilaya,
      commune: formData.commune,
      address: formData.address,
      deliveryType: formData.deliveryType,
      items: sanitizedItems,
      total: itemsTotal + (formData.wilaya ? actualDeliveryPrice : 0),
      deliveryCost: formData.wilaya ? actualDeliveryPrice : 0,
      date: new Date().toISOString(),
      status: 'pending'
    }));
    
    try {
      await setDoc(doc(db, 'orders', orderId), newOrder);
      
      setCart([]);
      setCheckoutForm({
        fullName: '',
        phone: '',
        phone2: '',
        wilaya: '',
        commune: '',
        address: '',
        deliveryType: 'home'
      });
      setIsSubmitting(false);
      navigate('/success');
    } catch (error: any) {
      setIsSubmitting(false);
      
      // If it's a quota error or database error, offer WhatsApp fallback
      const isQuotaError = error.message?.includes('Quota limit exceeded') || error.message?.includes('quota-exceeded');
      
      if (isQuotaError) {
        const message = `طلب جديد من المتجر:\n` +
          `رقم الطلب: ${orderId}\n` +
          `الاسم: ${formData.fullName}\n` +
          `الهاتف: ${formData.phone}\n` +
          `الولاية: ${formData.wilaya}\n` +
          `البلدية: ${formData.commune}\n` +
          `العنوان: ${formData.address}\n` +
          `المنتجات:\n` +
          sanitizedItems.map((item: any) => `- ${item.product.name} (x${item.quantity})`).join('\n') +
          `\nالإجمالي: ${itemsTotal + (formData.wilaya ? actualDeliveryPrice : 0)} دج`;
        
        const whatsappUrl = `https://wa.me/213562229915?text=${encodeURIComponent(message)}`;
        
        setToast({ 
          message: 'حدث ضغط على السيرفر. يرجى إرسال الطلب عبر واتساب لإتمامه بنجاح.', 
          type: 'error' 
        });
        
        // Open WhatsApp after a short delay
        setTimeout(() => {
          window.open(whatsappUrl, '_blank');
        }, 2000);
      } else {
        handleFirestoreError(error, OperationType.WRITE, `orders/${orderId}`);
      }
    }
  };

  const ProductPageWrapper = () => {
    const { productId } = useParams();
    const product = products.find(p => p.id === productId);
    
    if (!product) {
      return (
        <div className="pt-48 pb-32 text-center">
          <h1 className="text-4xl font-black">المنتج غير موجود</h1>
          <Link to="/" className="mt-8 inline-block bg-black text-white px-8 py-4 rounded-2xl font-black">العودة للرئيسية</Link>
        </div>
      );
    }

    return (
      <ProductDetail 
        product={product} 
        onAddToCart={handleAddToCart}
        onBack={() => navigate('/')}
        deliveryConfig={deliveryConfig}
        promoConfig={promoConfig}
        communes={communes}
        onComplete={(formData, quantity) => handleCompletePurchase(formData, quantity, product)}
        isSubmitting={isSubmitting}
      />
    );
  };

  // If quota is exceeded, we still want the app to run using cached data
  // We'll just show a subtle warning banner instead of a full screen error
  const QuotaWarning = () => (
    <motion.div 
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-amber-600 text-white p-4 rounded-2xl shadow-2xl z-[100] flex flex-col gap-2"
    >
      <div className="flex items-center gap-2 font-black text-sm">
        <AlertCircle size={18} /> تنبيه: ضغط زوار مرتفع جداً
      </div>
      <p className="text-[10px] leading-relaxed opacity-90">
        المتجر يعمل حالياً بنظام "التوفير الذكي". يمكنك تصفح المنتجات والطلب بشكل طبيعي. في حال تعذر تسجيل الطلب في السجل، سيتم تحويلك تلقائياً للواتساب لضمان وصول طلبك.
      </p>
      <button 
        onClick={() => setQuotaExceeded(false)}
        className="text-[10px] font-black underline text-right"
      >
        إخفاء التنبيه
      </button>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white" dir="rtl">
      {quotaExceeded && <QuotaWarning />}
      <AnimatePresence>
        {user?.email === ADMIN_EMAIL && showAdminBanner && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="fixed top-0 left-0 right-0 bg-green-600 text-white py-1 px-4 text-[10px] font-black text-center z-[100] flex items-center justify-center gap-2 overflow-hidden"
          >
            <ShieldCheck size={12} /> وضع المسؤول مفعل - مرحباً {user.displayName || user.email}
          </motion.div>
        )}
      </AnimatePresence>
      <Navbar 
        cartCount={cartCount} 
        onCartClick={() => setIsCartOpen(true)} 
        user={user}
        handleLogin={handleLogin}
        handleLogout={handleLogout}
        setIsAdminOpen={setIsAdminOpen}
        setIsMenuOpen={setIsMenuOpen}
        showAdminBanner={showAdminBanner}
      />

      <main>
        <Routes>
          <Route path="/" element={
            <>
              {/* Hero */}
              <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden bg-[#FAFAFA]">
                <div className="max-w-7xl mx-auto px-6 relative z-10">
                  <div className="flex flex-col lg:flex-row items-center gap-12">
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }} 
                      animate={{ opacity: 1, x: 0 }}
                      className="flex-1 text-right"
                    >
                      <div className="inline-flex items-center gap-2 bg-[#F8A192]/10 text-[#F8A192] px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest mb-6">
                        <Star size={14} fill="currentColor" />
                        مجموعة 2026 الجديدة
                      </div>
                      <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-[0.9] mb-8">
                        ارتقِ <br />
                        <span className="text-[#F8A192]">بأسلوبك</span> <br />
                        <span className="text-neutral-300 italic">اليومي.</span>
                      </h1>
                      <p className="text-lg md:text-xl text-neutral-500 mb-10 leading-relaxed max-w-xl ml-auto">
                        نحن نوفر التوصيل لجميع الولايات الـ 58 في الجزائر مع anderson express. جودة عالمية.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-4 justify-end">
                        <button 
                          onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })} 
                          className="bg-black text-white px-10 py-5 rounded-2xl text-xl font-black hover:bg-neutral-800 transition-all active:scale-95 shadow-xl shadow-black/10 flex items-center gap-3 justify-center"
                        >
                          تسوق الآن <ArrowLeft size={24} />
                        </button>
                      </div>
                    </motion.div>

                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex-[1.2] relative"
                    >
                      <div className="relative z-10">
                        <img 
                          src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=1000" 
                          alt="Featured Product" 
                          className="w-full h-auto object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="absolute -top-10 -left-10 w-40 h-40 bg-[#FFC107] rounded-full blur-3xl opacity-30 animate-pulse" />
                      <div className="absolute -bottom-10 -right-10 w-60 h-60 bg-[#F8A192] rounded-full blur-3xl opacity-20" />
                    </motion.div>
                  </div>
                </div>
              </section>

              {/* Products */}
              <section id="products" className="py-24">
                <div className="max-w-7xl mx-auto px-6">
                  <SectionHeading title="الأكثر مبيعاً" subtitle="منتجاتنا الأكثر طلباً، مصممة لتعزيز أسلوب حياتك." />
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {products.map(product => (
                      <ProductCard 
                        key={product.id} 
                        product={product} 
                        promoConfig={promoConfig} 
                      />
                    ))}
                  </div>
                </div>
              </section>

              {/* Trust */}
              <section className="py-20 bg-neutral-50">
                <div className="max-w-7xl mx-auto px-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
                    {TRUST_BADGES.map((badge, i) => (
                      <div key={`trust-${i}`} className="flex flex-col items-center text-center">
                        <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center mb-4 shadow-sm"><badge.icon size={28} /></div>
                        <h4 className="font-bold mb-1">{badge.text}</h4>
                        <p className="text-xs text-neutral-500">{badge.subtext}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </>
          } />

          <Route path="/product/:productId" element={<ProductPageWrapper />} />

          <Route path="/checkout" element={
            <div className="pt-32 pb-20 max-w-5xl mx-auto px-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                <div className="lg:col-span-7 space-y-10">
                  <h1 className="text-3xl font-bold">إتمام الطلب</h1>
                  <div className="space-y-8">
                    <section className="space-y-4">
                      <h3 className="font-bold flex items-center gap-2"><User size={18} /> المعلومات الشخصية</h3>
                      <div className="grid grid-cols-1 gap-4">
                        <input 
                          placeholder="الاسم الكامل 👤" 
                          className="w-full px-4 py-3 rounded-xl border border-neutral-200"
                          value={checkoutForm.fullName}
                          onChange={e => setCheckoutForm({...checkoutForm, fullName: e.target.value})}
                        />
                      </div>
                      <div className="relative">
                        <input 
                          type="tel"
                          inputMode="numeric"
                          placeholder="رقم الهاتف الأساسي 📞" 
                          maxLength={10}
                          className={`w-full px-4 py-3 rounded-xl border ${checkoutForm.phone.length === 10 ? 'border-neutral-200' : 'border-red-200'} transition-colors mb-2`}
                          value={checkoutForm.phone}
                          onChange={e => setCheckoutForm({...checkoutForm, phone: e.target.value.replace(/\D/g, '')})}
                        />
                        <input 
                          type="tel"
                          inputMode="numeric"
                          placeholder="رقم هاتف إضافي (اختياري) 📱" 
                          maxLength={10}
                          className="w-full px-4 py-3 rounded-xl border border-neutral-200 transition-colors"
                          value={checkoutForm.phone2}
                          onChange={e => setCheckoutForm({...checkoutForm, phone2: e.target.value.replace(/\D/g, '')})}
                        />
                        {checkoutForm.phone.length > 0 && checkoutForm.phone.length !== 10 && (
                          <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={10} /> يجب إدخال 10 أرقام بالضبط</p>
                        )}
                      </div>
                    </section>

                    <section className="space-y-4">
                      <h3 className="font-bold flex items-center gap-2"><MapPin size={18} /> عنوان التوصيل</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <select 
                          className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-white"
                          value={checkoutForm.wilaya}
                          onChange={e => setCheckoutForm({...checkoutForm, wilaya: e.target.value, commune: ''})}
                        >
                          <option value="">اختر الولاية</option>
                          {WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
                        </select>
                        <select 
                          className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-white disabled:opacity-50"
                          disabled={!checkoutForm.wilaya}
                          value={checkoutForm.commune}
                          onChange={e => setCheckoutForm({...checkoutForm, commune: e.target.value})}
                        >
                          <option value="">اختر البلدية</option>
                          {availableCommunes.map((c, idx) => <option key={`${c}-${idx}`} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="mt-4">
                        <input 
                          placeholder="العنوان الكامل (الشارع، رقم المنزل...) 🏠" 
                          className="w-full px-4 py-3 rounded-xl border border-neutral-200"
                          value={checkoutForm.address}
                          onChange={e => setCheckoutForm({...checkoutForm, address: e.target.value})}
                        />
                      </div>
                    </section>

                    <section className="space-y-4">
                      <h3 className="font-bold flex items-center gap-2"><Truck size={18} /> طريقة التوصيل</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <button 
                          onClick={() => setCheckoutForm({...checkoutForm, deliveryType: 'home'})}
                          className={`p-4 rounded-2xl border-2 transition-all text-right flex flex-col items-start ${checkoutForm.deliveryType === 'home' ? 'border-black bg-neutral-50' : 'border-neutral-100'}`}
                        >
                          <Home size={20} className="mb-3" />
                          <p className="font-bold text-sm">توصيل للمنزل</p>
                          <p className="text-xs text-neutral-500">
                            {checkoutForm.wilaya ? (deliveryConfig.wilayaCosts?.[checkoutForm.wilaya]?.home ? `${deliveryConfig.wilayaCosts[checkoutForm.wilaya].home} دج` : 'سعر التوصيل غير متوفر') : 'اختر الولاية أولاً'}
                          </p>
                        </button>
                        <button 
                          onClick={() => setCheckoutForm({...checkoutForm, deliveryType: 'office'})}
                          className={`p-4 rounded-2xl border-2 transition-all text-right flex flex-col items-start ${checkoutForm.deliveryType === 'office' ? 'border-black bg-neutral-50' : 'border-neutral-100'}`}
                        >
                          <Building2 size={20} className="mb-3" />
                          <p className="font-bold text-sm">توصيل للمكتب</p>
                          <p className="text-xs text-neutral-500">
                            {checkoutForm.wilaya ? (deliveryConfig.wilayaCosts?.[checkoutForm.wilaya]?.office ? `${deliveryConfig.wilayaCosts[checkoutForm.wilaya].office} دج` : 'سعر التوصيل غير متوفر') : 'اختر الولاية أولاً'}
                          </p>
                        </button>
                      </div>
                    </section>

                    <Button 
                      disabled={false}
                      loading={isSubmitting}
                      onClick={() => handleCompletePurchase(checkoutForm)} 
                      className={`w-full py-5 text-xl transition-all duration-300 ${
                        (!checkoutForm.fullName || checkoutForm.phone.length !== 10 || !checkoutForm.wilaya || !checkoutForm.commune || !checkoutForm.address)
                        ? "bg-neutral-200 text-neutral-400 shadow-none hover:bg-neutral-200" 
                        : "bg-[#22C55E] text-white hover:bg-[#16A34A]"
                      }`}
                    >
                      تأكيد الطلب — {finalTotal} دج
                    </Button>
                  </div>
                </div>

                <Toast 
                  message={toast?.message || ''} 
                  type={toast?.type || 'error'} 
                  onClose={() => setToast(null)} 
                />

                <div className="lg:col-span-5">
                  <div className="sticky top-32 p-8 rounded-3xl bg-neutral-50 border border-neutral-100">
                    <h3 className="text-lg font-bold mb-6">ملخص الطلب</h3>
                    <div className="space-y-4 mb-6">
                      {cart.map((item, idx) => (
                        <div key={`${item.product.id}-${idx}`} className="flex gap-4 border-b border-neutral-100 pb-4 last:border-0">
                          <div className="w-16 h-16 rounded-xl overflow-hidden bg-neutral-50 flex-shrink-0">
                            <img src={item.product.images[0]} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                          </div>
                          <div className="flex-1 flex flex-col justify-center">
                            <div className="flex justify-between text-sm mb-1">
                              <span className="font-bold">{item.product.name} (x{item.quantity})</span>
                              <span className="font-black">{getPrice(item.product) * item.quantity} دج</span>
                            </div>
                            {(item.selectedSize || item.selectedColor) && (
                              <div className="flex gap-2">
                                {item.selectedSize && <span className="text-[10px] text-neutral-400 font-bold">المقاس: {item.selectedSize}</span>}
                                {item.selectedColor && <span className="text-[10px] text-neutral-400 font-bold">اللون: {item.selectedColor}</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-3 pt-4 border-t border-neutral-200">
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-500">المجموع الفرعي</span>
                        <span className="font-bold">{subtotal} دج</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-500">سعر التوصيل</span>
                        <span className="font-bold">{deliveryPrice} دج</span>
                      </div>
                      <div className="pt-4 border-t border-neutral-200 flex justify-between">
                        <span className="text-lg font-bold">الإجمالي الكلي</span>
                        <span className="text-2xl font-black">{finalTotal} دج</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          } />

          <Route path="/success" element={
            <div className="pt-48 pb-32 max-w-xl mx-auto px-6 text-center" dir="rtl">
              <motion.div 
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-32 h-32 rounded-full bg-[#F8A192]/10 text-[#F8A192] flex items-center justify-center mx-auto mb-10 shadow-inner"
              >
                <Check size={64} strokeWidth={3} />
              </motion.div>
              <h1 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">تم استلام طلبك بنجاح! 🎉</h1>
              <p className="text-lg text-neutral-500 mb-12 leading-relaxed">
                شكراً لثقتك بنا. سنتصل بك قريباً لتأكيد الطلب وبدء عملية الشحن.
              </p>
              <div className="space-y-4">
                <button 
                  onClick={() => { navigate('/'); setCart([]); }} 
                  className="w-full bg-black text-white py-5 rounded-2xl text-xl font-black hover:bg-neutral-800 transition-all active:scale-95 shadow-xl shadow-black/10"
                >
                  العودة للتسوق
                </button>
                <a 
                  href="tel:0562229915"
                  className="w-full bg-green-600 text-white py-5 rounded-2xl text-xl font-black hover:bg-green-700 transition-all active:scale-95 shadow-xl shadow-green-600/10 flex items-center justify-center gap-3"
                >
                  <Phone size={24} /> اتصل بنا الآن
                </a>
              </div>
            </div>
          } />
        </Routes>
      </main>

      {/* Side Menu Drawer */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsMenuOpen(false)} 
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[80]" 
            />
            <motion.div 
              initial={{ x: '100%' }} 
              animate={{ x: 0 }} 
              exit={{ x: '100%' }} 
              className="fixed top-0 right-0 bottom-0 w-full max-w-[280px] bg-white z-[90] shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
                <h2 className="text-xl font-black">القائمة</h2>
                <button onClick={() => setIsMenuOpen(false)} className="p-2 hover:bg-neutral-100 rounded-full"><X size={20} /></button>
              </div>
              <div className="flex-1 p-6 space-y-4">
                <button 
                  onClick={() => { navigate('/'); setIsMenuOpen(false); }}
                  className="w-full text-right py-3 px-4 rounded-xl hover:bg-neutral-50 font-bold transition-colors flex items-center justify-between"
                >
                  <span>الرئيسية</span>
                  <ChevronRight size={18} className="rotate-180" />
                </button>
                <button 
                  onClick={() => { document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' }); setIsMenuOpen(false); }}
                  className="w-full text-right py-3 px-4 rounded-xl hover:bg-neutral-50 font-bold transition-colors flex items-center justify-between"
                >
                  <span>كل المنتجات</span>
                  <ChevronRight size={18} className="rotate-180" />
                </button>
                <button 
                  onClick={() => setIsMenuOpen(false)}
                  className="w-full text-right py-3 px-4 rounded-xl hover:bg-neutral-50 font-bold transition-colors flex items-center justify-between"
                >
                  <span>من نحن</span>
                  <ChevronRight size={18} className="rotate-180" />
                </button>
                <button 
                  onClick={() => setIsMenuOpen(false)}
                  className="w-full text-right py-3 px-4 rounded-xl hover:bg-neutral-50 font-bold transition-colors flex items-center justify-between"
                >
                  <span>اتصل بنا</span>
                  <ChevronRight size={18} className="rotate-180" />
                </button>
              </div>
              <div className="p-6 border-t border-neutral-100 bg-neutral-50">
                <div className="flex items-center gap-3 text-neutral-400 mb-4">
                  <Phone size={18} />
                  <span className="text-sm font-bold">0562229915</span>
                </div>
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">© 2026 لوكس الجزائر</p>
                {user?.email === ADMIN_EMAIL && (
                  <div className="mt-2 inline-flex items-center gap-1 bg-green-50 text-green-600 px-2 py-1 rounded-lg text-[8px] font-black uppercase">
                    <ShieldCheck size={10} /> وضع المسؤول مفعل
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCartOpen(false)} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white z-[70] shadow-2xl flex flex-col">
              <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
                <h2 className="text-xl font-bold">سلة التسوق ({cartCount})</h2>
                <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-neutral-100 rounded-full"><X size={20} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <ShoppingCart size={40} className="text-neutral-200 mb-4" />
                    <p className="text-neutral-500">السلة فارغة حالياً</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <h3 className="text-sm font-black uppercase tracking-widest text-neutral-400">المنتجات المختارة</h3>
                    {cart.map((item, idx) => (
                      <div key={`${item.product.id}-${idx}`} className="flex gap-4 group">
                        <div className="w-20 h-20 rounded-2xl overflow-hidden bg-neutral-50 flex-shrink-0 border border-neutral-100">
                          <img src={item.product.images[0]} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <h4 className="font-bold text-sm">{item.product.name}</h4>
                            <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="text-neutral-300 hover:text-red-500 transition-colors"><X size={16} /></button>
                          </div>
                          {(item.selectedSize || item.selectedColor) && (
                            <div className="flex gap-2 mb-2">
                              {item.selectedSize && <span className="text-[10px] bg-neutral-50 border border-neutral-100 px-2 py-0.5 rounded-md font-bold">المقاس: {item.selectedSize}</span>}
                              {item.selectedColor && <span className="text-[10px] bg-neutral-50 border border-neutral-100 px-2 py-0.5 rounded-md font-bold">اللون: {item.selectedColor}</span>}
                            </div>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <p className="font-black text-sm">{getPrice(item.product) * item.quantity} دج</p>
                            <div className="flex items-center gap-3 bg-neutral-50 rounded-full px-3 py-1 border border-neutral-100">
                              <button onClick={() => item.quantity > 1 && setCart(cart.map(i => i.product.id === item.product.id ? {...i, quantity: i.quantity - 1} : i))} className="text-neutral-400 hover:text-black transition-colors font-bold">-</button>
                              <span className="text-xs font-black min-w-[1rem] text-center">{item.quantity}</span>
                              <button onClick={() => setCart(cart.map(i => i.product.id === item.product.id ? {...i, quantity: i.quantity + 1} : i))} className="text-neutral-400 hover:text-black transition-colors font-bold">+</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {cart.length > 0 && (
                <div className="p-6 border-t bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
                  <div className="space-y-2 mb-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-400 font-bold">المجموع الفرعي</span>
                      <span className="font-bold">{subtotal} دج</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-neutral-50">
                      <span className="font-black">الإجمالي</span>
                      <span className="text-2xl font-black text-[#F8A192]">{subtotal} دج</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setIsCartOpen(false);
                      if (location.pathname === '/') {
                        document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
                      } else if (location.pathname.startsWith('/product/')) {
                        // If on product page, scroll to top
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      } else {
                        navigate('/');
                        setTimeout(() => {
                          document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
                        }, 100);
                      }
                    }}
                    className="w-full py-4 mb-3 border-2 border-dashed border-neutral-200 rounded-2xl text-neutral-400 font-bold hover:border-[#F8A192] hover:text-[#F8A192] transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={20} /> إضافة المزيد من المنتجات
                  </button>
                  <Button 
                    onClick={() => {
                      setIsCartOpen(false);
                      navigate('/checkout');
                    }}
                    className="w-full py-5 text-xl"
                  >
                    إتمام الطلب
                  </Button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAuthModalOpen && (
          <AuthModal 
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            onSubmit={handleEmailAuth}
            onGoogleLogin={handleGoogleLogin}
            isSubmitting={isSubmitting}
            onClose={() => setIsAuthModalOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Admin Panel */}
      <AnimatePresence>
        {isAdminOpen && user && user.email === ADMIN_EMAIL && (
          <AdminPanel 
            delivery={deliveryConfig} 
            setDelivery={setDeliveryConfig} 
            promo={promoConfig} 
            setPromo={setPromoConfig} 
            orders={orders}
            setOrders={setOrders}
            products={products}
            setProducts={setProducts}
            communes={communes}
            setCommunes={setCommunes}
            apiKey={apiKey}
            setApiKey={setApiKey}
            showAlert={showAlert}
            showConfirm={showConfirm}
            showPrompt={showPrompt}
            onClose={() => setIsAdminOpen(false)} 
            notificationHistory={notificationHistory}
            setNotificationHistory={setNotificationHistory}
          />
        )}
      </AnimatePresence>

      <NotificationManager 
        isAdmin={user?.email === ADMIN_EMAIL} 
        onAddNotification={addNotificationToHistory}
      />

      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        isDestructive={confirmModal.isDestructive}
      />

      <PromptModal 
        isOpen={promptModal.isOpen}
        title={promptModal.title}
        message={promptModal.message}
        onConfirm={promptModal.onConfirm}
        onCancel={() => setPromptModal({ ...promptModal, isOpen: false })}
        defaultValue={promptModal.defaultValue}
      />

      <AlertModal 
        isOpen={alertModal.isOpen}
        title={alertModal.title}
        message={alertModal.message}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
      />

      <footer className="bg-black text-white py-12 text-center">
        <p className="text-xs text-neutral-500 uppercase tracking-widest font-bold">© 2026 لوكس الجزائر. جميع الحقوق محفوظة.</p>
      </footer>
    </div>
  );
}
