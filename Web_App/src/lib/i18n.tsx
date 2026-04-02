'use client';

/**
 * src/lib/i18n.tsx
 *
 * Internationalisation context for the AKLI web app.
 *
 * Priority:
 *   1. Logged-in user's preferred_lang (from session cookie, via /api/session).
 *   2. Browser / OS language (navigator.language) for guests.
 *   3. Fallback → 'en'.
 *
 * Supported codes: 'en' | 'fr' | 'ar'
 *
 * Usage:
 *   // In any Client Component:
 *   import { useLang } from '@/lib/i18n';
 *   const { t, lang, setLang } = useLang();
 *   <h1>{t('hero_title')}</h1>
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';

export type LangCode = 'en' | 'fr' | 'ar';

// ---------------------------------------------------------------------------
// Translation table
// ---------------------------------------------------------------------------
const translations: Record<string, Record<LangCode, string>> = {
  // ── Navigation ────────────────────────────────────────────────────────
  nav_shop:           { en: 'Shop',        fr: 'Boutique',       ar: 'المتجر' },
  nav_cart:           { en: 'Cart',        fr: 'Panier',         ar: 'السلة' },
  nav_my_orders:      { en: 'My Orders',   fr: 'Mes commandes',  ar: 'طلباتي' },
  nav_admin:          { en: 'Admin',       fr: 'Admin',          ar: 'الإدارة' },
  nav_login:          { en: 'Log In',      fr: 'Connexion',      ar: 'تسجيل الدخول' },
  nav_register:       { en: 'Register',    fr: "S'inscrire",     ar: 'تسجيل' },
  nav_logout:         { en: 'Logout',      fr: 'Déconnexion',    ar: 'تسجيل الخروج' },

  // ── Home / Shop ───────────────────────────────────────────────────────
  hero_title:         { en: 'AKLI Shopping Website',          fr: 'Site de Shopping AKLI',           ar: 'موقع تسوق أكلي' },
  hero_sub:           { en: 'Browse our products and place a pickup order', fr: 'Parcourez nos produits et passez une commande de retrait', ar: 'تصفح منتجاتنا وضع طلب استلام' },
  cat_all:            { en: 'All',         fr: 'Tout',           ar: 'الكل' },
  loading:            { en: 'Loading products…', fr: 'Chargement…',    ar: 'جار التحميل…' },
  no_products:        { en: 'No products found in this category.', fr: 'Aucun produit dans cette catégorie.', ar: 'لا توجد منتجات في هذه الفئة.' },
  add_to_cart:        { en: 'Add to Cart', fr: 'Ajouter au panier', ar: 'أضف إلى السلة' },
  out_of_stock:       { en: 'Out of Stock', fr: 'Rupture de stock', ar: 'نفد من المخزون' },
  stock:              { en: 'Stock',       fr: 'Stock',          ar: 'المخزون' },
  low_stock:          { en: 'Low',         fr: 'Faible',         ar: 'منخفض' },
  cart_banner:        { en: '{n} item(s) in cart — Click to checkout', fr: '{n} article(s) dans le panier — Cliquer pour commander', ar: '{n} منتج في السلة — انقر للدفع' },

  // ── Login ─────────────────────────────────────────────────────────────
  login_title:        { en: 'Login to AKLI Shopping',    fr: 'Connexion à AKLI Shopping',  ar: 'تسجيل الدخول إلى أكلي' },
  username:           { en: 'Username',    fr: "Nom d'utilisateur", ar: 'اسم المستخدم' },
  password:           { en: 'Password',    fr: 'Mot de passe',   ar: 'كلمة المرور' },
  enter_username:     { en: 'Enter username', fr: "Entrez votre nom d'utilisateur", ar: 'أدخل اسم المستخدم' },
  sign_in:            { en: 'Sign in',     fr: 'Se connecter',   ar: 'تسجيل الدخول' },
  signing_in:         { en: 'Signing in…', fr: 'Connexion…',     ar: 'جار التسجيل…' },
  no_account:         { en: 'No account?', fr: 'Pas de compte ?', ar: 'ليس لديك حساب؟' },
  register_here:      { en: 'Register here', fr: "S'inscrire ici", ar: 'سجّل هنا' },

  // ── Registration ──────────────────────────────────────────────────────
  reg_title:          { en: 'Create an Account', fr: 'Créer un compte', ar: 'إنشاء حساب' },
  first_name:         { en: 'First Name *', fr: 'Prénom *',      ar: 'الاسم الأول *' },
  last_name:          { en: 'Last Name *',  fr: 'Nom de famille *', ar: 'اسم العائلة *' },
  username_label:     { en: 'Username *',   fr: "Nom d'utilisateur *", ar: 'اسم المستخدم *' },
  username_ph:        { en: 'Choose a username', fr: 'Choisissez un nom', ar: 'اختر اسم مستخدم' },
  password_label:     { en: 'Password *',   fr: 'Mot de passe *', ar: 'كلمة المرور *' },
  password_ph:        { en: 'Min 8 chars, 1 upper, 1 lower, 1 number', fr: 'Min 8 car., 1 maj., 1 min., 1 chiffre', ar: 'الحد الأدنى 8 أحرف، حرف كبير، صغير، رقم' },
  email_label:        { en: 'Email Address *', fr: 'Adresse e-mail *', ar: 'البريد الإلكتروني *' },
  address_label:      { en: 'Address',      fr: 'Adresse',        ar: 'العنوان' },
  address_ph:         { en: '123 Main St',  fr: '123 Rue Principale', ar: '123 الشارع الرئيسي' },
  city_label:         { en: 'City',         fr: 'Ville',          ar: 'المدينة' },
  province_label:     { en: 'Province/State', fr: 'Province/État', ar: 'الولاية/المقاطعة' },
  preferred_lang:     { en: 'Preferred Language', fr: 'Langue préférée', ar: 'اللغة المفضلة' },
  lang_en:            { en: 'English',      fr: 'Anglais',        ar: 'الإنجليزية' },
  lang_fr:            { en: 'French',       fr: 'Français',       ar: 'الفرنسية' },
  lang_ar:            { en: 'Arabic',       fr: 'Arabe',          ar: 'العربية' },
  register_btn:       { en: 'Register',     fr: "S'inscrire",     ar: 'تسجيل' },
  registering:        { en: 'Registering…', fr: 'Inscription…',   ar: 'جار التسجيل…' },
  already_have_acct:  { en: 'Already have an account?', fr: 'Vous avez déjà un compte ?', ar: 'هل لديك حساب بالفعل؟' },
  login_link:         { en: 'Login',        fr: 'Connexion',      ar: 'تسجيل الدخول' },

  // ── Cart ──────────────────────────────────────────────────────────────
  cart_title:         { en: 'Your Cart',    fr: 'Votre panier',   ar: 'سلتك' },
  cart_empty:         { en: 'Your cart is empty.', fr: 'Votre panier est vide.', ar: 'سلتك فارغة.' },
  product_name:       { en: 'Product',      fr: 'Produit',        ar: 'المنتج' },
  unit_price:         { en: 'Unit Price',   fr: 'Prix unitaire',  ar: 'السعر الفردي' },
  quantity:           { en: 'Quantity',     fr: 'Quantité',       ar: 'الكمية' },
  subtotal:           { en: 'Subtotal',     fr: 'Sous-total',     ar: 'المجموع الفرعي' },
  remove:             { en: 'Remove',       fr: 'Supprimer',      ar: 'إزالة' },
  order_total:        { en: 'Order Total',  fr: 'Total commande', ar: 'إجمالي الطلب' },
  placing_order:      { en: 'Placing order…', fr: 'Commande en cours…', ar: 'جار الطلب…' },
  place_order:        { en: 'Place Order',  fr: 'Passer la commande', ar: 'تأكيد الطلب' },

  // ── Orders ────────────────────────────────────────────────────────────
  orders_title:       { en: 'My Orders',    fr: 'Mes commandes',  ar: 'طلباتي' },
  order_id:           { en: 'Order #',      fr: 'Commande #',     ar: 'طلب #' },
  status:             { en: 'Status',       fr: 'Statut',         ar: 'الحالة' },
  date:               { en: 'Date',         fr: 'Date',           ar: 'التاريخ' },
  items:              { en: 'Items',        fr: 'Articles',       ar: 'المنتجات' },
  pending:            { en: 'Pending',      fr: 'En attente',     ar: 'قيد الانتظار' },
  ready_for_pickup:   { en: 'Ready for Pickup', fr: 'Prêt pour retrait', ar: 'جاهز للاستلام' },
  completed:          { en: 'Completed',    fr: 'Terminée',       ar: 'مكتملة' },

  // ── Product detail ────────────────────────────────────────────────────
  back:               { en: '← Back',      fr: '← Retour',       ar: '← رجوع' },
  description:        { en: 'Description', fr: 'Description',    ar: 'الوصف' },
  price:              { en: 'Price',        fr: 'Prix',           ar: 'السعر' },
  category:           { en: 'Category',     fr: 'Catégorie',      ar: 'الفئة' },
  no_description:     { en: 'No description available.', fr: 'Aucune description disponible.', ar: 'لا يوجد وصف متاح.' },

  // ── Profile ───────────────────────────────────────────────────────────
  profile_title:      { en: 'My Profile',   fr: 'Mon profil',     ar: 'ملفي الشخصي' },
  save_changes:       { en: 'Save Changes', fr: 'Enregistrer',    ar: 'حفظ التغييرات' },
  saving:             { en: 'Saving…',      fr: 'Enregistrement…', ar: 'جار الحفظ…' },
  saved_ok:           { en: 'Profile updated!', fr: 'Profil mis à jour !', ar: 'تم تحديث الملف الشخصي!' },

  // ── Admin ─────────────────────────────────────────────────────────────
  admin_dashboard:    { en: 'Admin Dashboard', fr: "Tableau de bord admin", ar: 'لوحة التحكم' },
  products_mgmt:      { en: 'Products',     fr: 'Produits',       ar: 'المنتجات' },
  categories_mgmt:    { en: 'Categories',   fr: 'Catégories',     ar: 'الفئات' },
  users_mgmt:         { en: 'Users',        fr: 'Utilisateurs',   ar: 'المستخدمون' },
  statistics:         { en: 'Statistics',   fr: 'Statistiques',   ar: 'الإحصائيات' },
  reports:            { en: 'Reports',      fr: 'Rapports',       ar: 'التقارير' },

  // ── Generic ───────────────────────────────────────────────────────────
  server_error:       { en: 'Server error. Please try again.', fr: 'Erreur serveur. Veuillez réessayer.', ar: 'خطأ في الخادم. حاول مجدداً.' },
  copyright:          { en: 'Copyright',    fr: 'Droits réservés', ar: 'جميع الحقوق محفوظة' },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map a raw locale string (e.g. 'fr-FR', 'ar', 'en-US') to one of our codes. */
function detectBrowserLang(): LangCode {
  if (typeof navigator === 'undefined') return 'en';
  const lang = (navigator.language || '').toLowerCase();
  if (lang.startsWith('fr')) return 'fr';
  if (lang.startsWith('ar')) return 'ar';
  return 'en';
}

function normalise(code: string | null | undefined): LangCode {
  const c = (code || '').toLowerCase().trim().slice(0, 2) as LangCode;
  return ['en', 'fr', 'ar'].includes(c) ? c : 'en';
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface LangContextValue {
  lang: LangCode;
  setLang: (code: LangCode) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  dir: 'ltr' | 'rtl';
}

const LangContext = createContext<LangContextValue>({
  lang: 'en',
  setLang: () => {},
  t: (key) => key,
  dir: 'ltr',
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<LangCode>('en');

  useEffect(() => {
    // Try to get the session user's preferred_lang first
    fetch('/api/session')
      .then((r) => r.json())
      .then((data) => {
        const preferred = data?.user?.preferred_lang;
        if (preferred) {
          setLangState(normalise(preferred));
        } else {
          // Fall back to browser locale for guests
          setLangState(detectBrowserLang());
        }
      })
      .catch(() => {
        setLangState(detectBrowserLang());
      });
  }, []);

  const setLang = useCallback((code: LangCode) => {
    setLangState(normalise(code));
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      const entry = translations[key];
      let text = (entry?.[lang] ?? entry?.en) ?? key;
      if (vars) {
        Object.entries(vars).forEach(([k, v]) => {
          text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        });
      }
      return text;
    },
    [lang]
  );

  const dir: 'ltr' | 'rtl' = lang === 'ar' ? 'rtl' : 'ltr';

  return (
    <LangContext.Provider value={{ lang, setLang, t, dir }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang(): LangContextValue {
  return useContext(LangContext);
}
