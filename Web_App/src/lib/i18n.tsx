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
  back_to_shop:       { en: '← Back to Shop', fr: '← Retour à la boutique', ar: '← العودة للمتجر' },
  description:        { en: 'Description', fr: 'Description',    ar: 'الوصف' },
  price:              { en: 'Price',        fr: 'Prix',           ar: 'السعر' },
  category:           { en: 'Category',     fr: 'Catégorie',      ar: 'الفئة' },
  no_description:     { en: 'No description available.', fr: 'Aucune description disponible.', ar: 'لا يوجد وصف متاح.' },
  product_not_found:  { en: 'Product not found.', fr: 'Produit introuvable.', ar: 'المنتج غير موجود.' },
  was:                { en: 'Was',          fr: 'Ancien',         ar: 'كان' },
  location:           { en: 'Location:',    fr: 'Emplacement :',  ar: 'الموقع:' },
  tax:                { en: 'Tax:',         fr: 'Taxe :',         ar: 'الضريبة:' },
  stock_colon:        { en: 'Stock:',       fr: 'Stock :',        ar: 'المخزون:' },
  added_to_cart:      { en: '✓ Added to Cart!', fr: '✓ Ajouté au panier !', ar: '✓ تمت الإضافة!' },
  view_cart:          { en: 'View Cart',    fr: 'Voir le panier', ar: 'عرض السلة' },

  // ── Profile ───────────────────────────────────────────────────────────
  profile_title:      { en: 'My Profile',   fr: 'Mon profil',     ar: 'ملفي الشخصي' },
  save_changes:       { en: 'Save Changes', fr: 'Enregistrer',    ar: 'حفظ التغييرات' },
  saving:             { en: 'Saving…',      fr: 'Enregistrement…', ar: 'جار الحفظ…' },
  saved_ok:           { en: 'Profile updated!', fr: 'Profil mis à jour !', ar: 'تم تحديث الملف الشخصي!' },

  // ── Admin ─────────────────────────────────────────────────────────────
  admin_dashboard:    { en: 'Admin Dashboard', fr: "Tableau de bord admin", ar: 'لوحة التحكم' },
  low_stock_alerts:   { en: '⚠️ Low Stock Alerts', fr: '⚠️ Alertes de stock bas', ar: '⚠️ تنبيهات نقص المخزون' },
  all_stocked:        { en: 'All products are adequately stocked.', fr: 'Tous les produits sont suffisamment en stock.', ar: 'جميع المنتجات متوفرة بشكل كافٍ.' },
  min_threshold:      { en: 'Min Threshold', fr: 'Seuil Min',     ar: 'الحد الأدنى' },
  shortage:           { en: 'Shortage',     fr: 'Manque',         ar: 'النقص' },
  pos_terminal:       { en: '💻 POS Terminal', fr: '💻 Terminal de point de vente', ar: '💻 نقطة البيع' },
  pos_desc:           { en: 'Process local sales & checkout', fr: 'Traiter les ventes locales et les encaissements', ar: 'معالجة المبيعات المحلية' },
  web_orders:         { en: '🌐 Web Orders', fr: '🌐 Commandes Web', ar: '🌐 طلبات الويب' },
  web_orders_desc:    { en: 'Ready pickups & complete orders', fr: 'Commandes prêtes au retrait et terminées', ar: 'جاهز للاستلام وطلبات مكتملة' },
  products_mgmt:      { en: '📦 Products',     fr: '📦 Produits',       ar: '📦 المنتجات' },
  products_desc:      { en: 'Add & manage products', fr: 'Ajouter et gérer des produits', ar: 'إضافة وإدارة المنتجات' },
  categories_mgmt:    { en: '🗂️ Categories',   fr: '🗂️ Catégories',     ar: '🗂️ الفئات' },
  categories_desc:    { en: 'Manage product categories', fr: 'Gérer les catégories de produits', ar: 'إدارة فئات المنتجات' },
  stock_mgmt:         { en: '📥 Stock',       fr: '📥 Stock',          ar: '📥 المخزون' },
  stock_desc:         { en: 'Receive new inventory', fr: 'Recevoir de nouveaux stocks', ar: 'استلام مخزون جديد' },
  adjustments_mgmt:   { en: '🔧 Adjustments', fr: '🔧 Ajustements',   ar: '🔧 التعديلات' },
  adjustments_desc:   { en: 'Shrinkage & damage', fr: 'Pertes et dommages', ar: 'نقص وتلف' },
  price_rules:        { en: '🏷️ Price Rules', fr: '🏷️ Règles de prix', ar: '🏷️ قواعد الأسعار' },
  price_rules_desc:   { en: 'Deals & promotions', fr: 'Offres et promotions', ar: 'عروض وتخفيضات' },
  users_mgmt:         { en: '👥 Users',        fr: '👥 Utilisateurs',   ar: '👥 المستخدمون' },
  users_desc:         { en: 'Manage staff accounts', fr: 'Gérer les comptes du personnel', ar: 'إدارة حسابات الموظفين' },
  statistics:         { en: '📈 Statistics',   fr: '📈 Statistiques',   ar: '📈 الإحصائيات' },
  statistics_desc:    { en: 'Daily, monthly & yearly analytics', fr: 'Analyses quotidiennes, mensuelles et annuelles', ar: 'تحليلات يومية، شهرية وسنوية' },
  reports:            { en: '📊 Reports',      fr: '📊 Rapports',       ar: '📊 التقارير' },
  reports_desc:       { en: 'Revenue & profit', fr: 'Revenus et bénéfices', ar: 'الإيرادات والأرباح' },
  tax_categories:     { en: '🧾 Tax',          fr: '🧾 Taxes',          ar: '🧾 الضرائب' },
  tax_categories_desc:{ en: 'Tax categories', fr: 'Catégories fiscales', ar: 'فئات الضرائب' },
  settings_mgmt:      { en: '⚙️ Settings',     fr: '⚙️ Paramètres',     ar: '⚙️ الإعدادات' },
  settings_desc:      { en: 'Currency & theme', fr: 'Devise et thème', ar: 'العملة والمظهر' },

  // ── Generic ───────────────────────────────────────────────────────────
  server_error:       { en: 'Server error. Please try again.', fr: 'Erreur serveur. Veuillez réessayer.', ar: 'خطأ في الخادم. حاول مجدداً.' },
  copyright:          { en: 'Copyright',    fr: 'Droits réservés', ar: 'جميع الحقوق محفوظة' },
  terms:              { en: 'Terms of Service', fr: 'Conditions d\'utilisation', ar: 'شروط الخدمة' },
  privacy:            { en: 'Privacy Policy', fr: 'Politique de confidentialité', ar: 'سياسة الخصوصية' },
  agree_terms:        { en: 'I agree to the Terms of Service and Privacy Policy, and consent to data processing (GDPR, CCPA, PIPEDA, Law 18-07).', fr: 'J\'accepte les Conditions d\'utilisation et la Politique de confidentialité, et je consens au traitement des données (RGPD, CCPA, LPRPDE, Loi 18-07).', ar: 'أوافق على شروط الخدمة وسياسة الخصوصية، وأوافق على معالجة البيانات.' },
  cookie_consent:     { en: 'We use cookies to ensure you get the best experience on our website according to EU, US, CA and DZ regulations.', fr: 'Nous utilisons des cookies pour vous garantir la meilleure expérience sur notre site.', ar: 'نحن نستخدم ملفات تعريف الارتباط لضمان حصولك على أفضل تجربة.' },
  accept_cookies:     { en: 'Accept', fr: 'Accepter', ar: 'قبول' },
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

const LS_KEY = 'aklsof_lang';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  /**
   * Initialisation order (highest → lowest priority):
   *   1. localStorage  — persists explicit user switch across navigations
   *   2. /api/session  — logged-in user's DB preference (updates localStorage)
   *   3. navigator.language — browser locale for first-time guests
   *   4. 'en' fallback
   *
   * Reading localStorage in the useState initialiser avoids the one-frame
   * flash where the whole UI appears in 'en' before the effect fires.
   */
  const [lang, setLangState] = useState<LangCode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) return normalise(saved);
    }
    return 'en'; // SSR default; browser locale applied in the effect below
  });

  useEffect(() => {
    // On mount, apply browser locale if localStorage had nothing
    if (!localStorage.getItem(LS_KEY)) {
      setLangState(detectBrowserLang());
    }

    // Then try to honour the logged-in user's stored preference
    fetch('/api/session')
      .then((r) => r.json())
      .then((data) => {
        const preferred = data?.user?.preferred_lang;
        if (preferred) {
          const code = normalise(preferred);
          setLangState(code);
          localStorage.setItem(LS_KEY, code);
        }
      })
      .catch(() => {
        // Network error / cold start — localStorage already applied above
      });
  }, []);

  /** Persist every explicit language switch so it survives navigation. */
  const setLang = useCallback((code: LangCode) => {
    const normalised = normalise(code);
    setLangState(normalised);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LS_KEY, normalised);
    }
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
