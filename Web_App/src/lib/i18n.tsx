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
 * Supported codes: 'en' | 'fr' | 'ar' | 'es'
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

export type LangCode = 'en' | 'fr' | 'ar' | 'es';

// ---------------------------------------------------------------------------
// Translation table
// ---------------------------------------------------------------------------
const translations: Record<string, Record<LangCode, string>> = {
  // ── Navigation ────────────────────────────────────────────────────────
  nav_shop:           { en: 'Shop',        fr: 'Boutique',       ar: 'المتجر',          es: 'Tienda' },
  nav_cart:           { en: 'Cart',        fr: 'Panier',         ar: 'السلة',           es: 'Carrito' },
  nav_my_orders:      { en: 'My Orders',   fr: 'Mes commandes',  ar: 'طلباتي',          es: 'Mis pedidos' },
  nav_admin:          { en: 'Admin',       fr: 'Admin',          ar: 'الإدارة',         es: 'Admin' },
  nav_login:          { en: 'Log In',      fr: 'Connexion',      ar: 'تسجيل الدخول',   es: 'Iniciar sesión' },
  nav_register:       { en: 'Register',    fr: "S'inscrire",     ar: 'تسجيل',           es: 'Registrarse' },
  nav_logout:         { en: 'Logout',      fr: 'Déconnexion',    ar: 'تسجيل الخروج',   es: 'Cerrar sesión' },

  // ── Home / Shop ───────────────────────────────────────────────────────
  hero_title:         { en: 'AKLI Shopping Website',          fr: 'Site de Shopping AKLI',           ar: 'موقع تسوق أكلي',          es: 'Sitio de Compras AKLI' },
  hero_sub:           { en: 'Browse our products and place a pickup order', fr: 'Parcourez nos produits et passez une commande de retrait', ar: 'تصفح منتجاتنا وضع طلب استلام', es: 'Explore nuestros productos y realice un pedido de recogida' },
  cat_all:            { en: 'All',         fr: 'Tout',           ar: 'الكل',            es: 'Todo' },
  loading:            { en: 'Loading products…', fr: 'Chargement…',    ar: 'جار التحميل…',   es: 'Cargando productos…' },
  no_products:        { en: 'No products found in this category.', fr: 'Aucun produit dans cette catégorie.', ar: 'لا توجد منتجات في هذه الفئة.', es: 'No se encontraron productos en esta categoría.' },
  add_to_cart:        { en: 'Add to Cart', fr: 'Ajouter au panier', ar: 'أضف إلى السلة', es: 'Añadir al carrito' },
  out_of_stock:       { en: 'Out of Stock', fr: 'Rupture de stock', ar: 'نفد من المخزون', es: 'Sin existencias' },
  stock:              { en: 'Stock',       fr: 'Stock',          ar: 'المخزون',         es: 'Stock' },
  low_stock:          { en: 'Low',         fr: 'Faible',         ar: 'منخفض',           es: 'Bajo' },
  cart_banner:        { en: '{n} item(s) in cart — Click to checkout', fr: '{n} article(s) dans le panier — Cliquer pour commander', ar: '{n} منتج في السلة — انقر للدفع', es: '{n} artículo(s) en el carrito — Haga clic para pagar' },

  // ── Login ─────────────────────────────────────────────────────────────
  login_title:        { en: 'Login to AKLI Shopping',    fr: 'Connexion à AKLI Shopping',  ar: 'تسجيل الدخول إلى أكلي', es: 'Iniciar sesión en AKLI Shopping' },
  username:           { en: 'Username',    fr: "Nom d'utilisateur", ar: 'اسم المستخدم',  es: 'Usuario' },
  password:           { en: 'Password',    fr: 'Mot de passe',   ar: 'كلمة المرور',    es: 'Contraseña' },
  enter_username:     { en: 'Enter username', fr: "Entrez votre nom d'utilisateur", ar: 'أدخل اسم المستخدم', es: 'Ingrese su usuario' },
  sign_in:            { en: 'Sign in',     fr: 'Se connecter',   ar: 'تسجيل الدخول',   es: 'Ingresar' },
  signing_in:         { en: 'Signing in…', fr: 'Connexion…',     ar: 'جار التسجيل…',   es: 'Iniciando sesión…' },
  no_account:         { en: 'No account?', fr: 'Pas de compte ?', ar: 'ليس لديك حساب؟', es: '¿Sin cuenta?' },
  register_here:      { en: 'Register here', fr: "S'inscrire ici", ar: 'سجّل هنا',       es: 'Regístrate aquí' },

  // ── Registration ──────────────────────────────────────────────────────
  reg_title:          { en: 'Create an Account', fr: 'Créer un compte', ar: 'إنشاء حساب',  es: 'Crear una cuenta' },
  first_name:         { en: 'First Name *', fr: 'Prénom *',      ar: 'الاسم الأول *',  es: 'Nombre *' },
  last_name:          { en: 'Last Name *',  fr: 'Nom de famille *', ar: 'اسم العائلة *', es: 'Apellido *' },
  username_label:     { en: 'Username *',   fr: "Nom d'utilisateur *", ar: 'اسم المستخدم *', es: 'Usuario *' },
  username_ph:        { en: 'Choose a username', fr: 'Choisissez un nom', ar: 'اختر اسم مستخدم', es: 'Elige un nombre de usuario' },
  password_label:     { en: 'Password *',   fr: 'Mot de passe *', ar: 'كلمة المرور *',  es: 'Contraseña *' },
  password_ph:        { en: 'Min 8 chars, 1 upper, 1 lower, 1 number', fr: 'Min 8 car., 1 maj., 1 min., 1 chiffre', ar: 'الحد الأدنى 8 أحرف، حرف كبير، صغير، رقم', es: 'Mín. 8 car., 1 may., 1 min., 1 número' },
  email_label:        { en: 'Email Address *', fr: 'Adresse e-mail *', ar: 'البريد الإلكتروني *', es: 'Correo electrónico *' },
  address_label:      { en: 'Address',      fr: 'Adresse',        ar: 'العنوان',         es: 'Dirección' },
  address_ph:         { en: '123 Main St',  fr: '123 Rue Principale', ar: '123 الشارع الرئيسي', es: '123 Calle Principal' },
  city_label:         { en: 'City',         fr: 'Ville',          ar: 'المدينة',         es: 'Ciudad' },
  province_label:     { en: 'Province/State', fr: 'Province/État', ar: 'الولاية/المقاطعة', es: 'Provincia/Estado' },
  preferred_lang:     { en: 'Preferred Language', fr: 'Langue préférée', ar: 'اللغة المفضلة', es: 'Idioma preferido' },
  lang_en:            { en: 'English',      fr: 'Anglais',        ar: 'الإنجليزية',     es: 'Inglés' },
  lang_fr:            { en: 'French',       fr: 'Français',       ar: 'الفرنسية',       es: 'Francés' },
  lang_ar:            { en: 'Arabic',       fr: 'Arabe',          ar: 'العربية',        es: 'Árabe' },
  lang_es:            { en: 'Spanish',      fr: 'Espagnol',       ar: 'الإسبانية',      es: 'Español' },
  register_btn:       { en: 'Register',     fr: "S'inscrire",     ar: 'تسجيل',           es: 'Registrarse' },
  registering:        { en: 'Registering…', fr: 'Inscription…',   ar: 'جار التسجيل…',   es: 'Registrando…' },
  already_have_acct:  { en: 'Already have an account?', fr: 'Vous avez déjà un compte ?', ar: 'هل لديك حساب بالفعل؟', es: '¿Ya tienes una cuenta?' },
  login_link:         { en: 'Login',        fr: 'Connexion',      ar: 'تسجيل الدخول',   es: 'Iniciar sesión' },

  // ── Cart ──────────────────────────────────────────────────────────────
  cart_title:         { en: 'Your Cart',    fr: 'Votre panier',   ar: 'سلتك',            es: 'Tu carrito' },
  cart_empty:         { en: 'Your cart is empty.', fr: 'Votre panier est vide.', ar: 'سلتك فارغة.', es: 'Tu carrito está vacío.' },
  product_name:       { en: 'Product',      fr: 'Produit',        ar: 'المنتج',          es: 'Producto' },
  unit_price:         { en: 'Unit Price',   fr: 'Prix unitaire',  ar: 'السعر الفردي',   es: 'Precio unitario' },
  quantity:           { en: 'Quantity',     fr: 'Quantité',       ar: 'الكمية',          es: 'Cantidad' },
  subtotal:           { en: 'Subtotal',     fr: 'Sous-total',     ar: 'المجموع الفرعي', es: 'Subtotal' },
  remove:             { en: 'Remove',       fr: 'Supprimer',      ar: 'إزالة',           es: 'Eliminar' },
  order_total:        { en: 'Order Total',  fr: 'Total commande', ar: 'إجمالي الطلب',   es: 'Total del pedido' },
  placing_order:      { en: 'Placing order…', fr: 'Commande en cours…', ar: 'جار الطلب…', es: 'Realizando pedido…' },
  place_order:        { en: 'Place Order',  fr: 'Passer la commande', ar: 'تأكيد الطلب', es: 'Realizar pedido' },

  // ── Orders ────────────────────────────────────────────────────────────
  orders_title:       { en: 'My Orders',    fr: 'Mes commandes',  ar: 'طلباتي',          es: 'Mis pedidos' },
  order_id:           { en: 'Order #',      fr: 'Commande #',     ar: 'طلب #',           es: 'Pedido #' },
  status:             { en: 'Status',       fr: 'Statut',         ar: 'الحالة',          es: 'Estado' },
  date:               { en: 'Date',         fr: 'Date',           ar: 'التاريخ',         es: 'Fecha' },
  items:              { en: 'Items',        fr: 'Articles',       ar: 'المنتجات',        es: 'Artículos' },
  pending:            { en: 'Pending',      fr: 'En attente',     ar: 'قيد الانتظار',   es: 'Pendiente' },
  ready_for_pickup:   { en: 'Ready for Pickup', fr: 'Prêt pour retrait', ar: 'جاهز للاستلام', es: 'Listo para recoger' },
  completed:          { en: 'Completed',    fr: 'Terminée',       ar: 'مكتملة',          es: 'Completado' },

  // ── Product detail ────────────────────────────────────────────────────
  back:               { en: '← Back',      fr: '← Retour',       ar: '← رجوع',          es: '← Atrás' },
  back_to_shop:       { en: '← Back to Shop', fr: '← Retour à la boutique', ar: '← العودة للمتجر', es: '← Volver a la tienda' },
  description:        { en: 'Description', fr: 'Description',    ar: 'الوصف',           es: 'Descripción' },
  price:              { en: 'Price',        fr: 'Prix',           ar: 'السعر',           es: 'Precio' },
  category:           { en: 'Category',     fr: 'Catégorie',      ar: 'الفئة',           es: 'Categoría' },
  no_description:     { en: 'No description available.', fr: 'Aucune description disponible.', ar: 'لا يوجد وصف متاح.', es: 'Sin descripción disponible.' },
  product_not_found:  { en: 'Product not found.', fr: 'Produit introuvable.', ar: 'المنتج غير موجود.', es: 'Producto no encontrado.' },
  was:                { en: 'Was',          fr: 'Ancien',         ar: 'كان',             es: 'Antes' },
  location:           { en: 'Location:',    fr: 'Emplacement :',  ar: 'الموقع:',         es: 'Ubicación:' },
  tax:                { en: 'Tax:',         fr: 'Taxe :',         ar: 'الضريبة:',        es: 'Impuesto:' },
  stock_colon:        { en: 'Stock:',       fr: 'Stock :',        ar: 'المخزون:',        es: 'Stock:' },
  added_to_cart:      { en: '✓ Added to Cart!', fr: '✓ Ajouté au panier !', ar: '✓ تمت الإضافة!', es: '✓ ¡Añadido al carrito!' },
  view_cart:          { en: 'View Cart',    fr: 'Voir le panier', ar: 'عرض السلة',       es: 'Ver carrito' },

  // ── Profile ───────────────────────────────────────────────────────────
  profile_title:      { en: 'My Profile',   fr: 'Mon profil',     ar: 'ملفي الشخصي',    es: 'Mi perfil' },
  save_changes:       { en: 'Save Changes', fr: 'Enregistrer',    ar: 'حفظ التغييرات',  es: 'Guardar cambios' },
  saving:             { en: 'Saving…',      fr: 'Enregistrement…', ar: 'جار الحفظ…',    es: 'Guardando…' },
  saved_ok:           { en: 'Profile updated!', fr: 'Profil mis à jour !', ar: 'تم تحديث الملف الشخصي!', es: '¡Perfil actualizado!' },

  // ── Admin ─────────────────────────────────────────────────────────────
  admin_dashboard:    { en: 'Admin Dashboard', fr: "Tableau de bord admin", ar: 'لوحة التحكم',       es: 'Panel de administración' },
  low_stock_alerts:   { en: '⚠️ Low Stock Alerts', fr: '⚠️ Alertes de stock bas', ar: '⚠️ تنبيهات نقص المخزون', es: '⚠️ Alertas de stock bajo' },
  all_stocked:        { en: 'All products are adequately stocked.', fr: 'Tous les produits sont suffisamment en stock.', ar: 'جميع المنتجات متوفرة بشكل كافٍ.', es: 'Todos los productos tienen stock suficiente.' },
  min_threshold:      { en: 'Min Threshold', fr: 'Seuil Min',     ar: 'الحد الأدنى',    es: 'Umbral mínimo' },
  shortage:           { en: 'Shortage',     fr: 'Manque',         ar: 'النقص',           es: 'Faltante' },
  pos_terminal:       { en: '💻 POS Terminal', fr: '💻 Terminal de point de vente', ar: '💻 نقطة البيع', es: '💻 Terminal POS' },
  pos_desc:           { en: 'Process local sales & checkout', fr: 'Traiter les ventes locales et les encaissements', ar: 'معالجة المبيعات المحلية', es: 'Procesar ventas locales y cobros' },
  web_orders:         { en: '🌐 Web Orders', fr: '🌐 Commandes Web', ar: '🌐 طلبات الويب', es: '🌐 Pedidos web' },
  web_orders_desc:    { en: 'Ready pickups & complete orders', fr: 'Commandes prêtes au retrait et terminées', ar: 'جاهز للاستلام وطلبات مكتملة', es: 'Recogidas listas y pedidos completados' },
  products_mgmt:      { en: '📦 Products',     fr: '📦 Produits',       ar: '📦 المنتجات',       es: '📦 Productos' },
  products_desc:      { en: 'Add & manage products', fr: 'Ajouter et gérer des produits', ar: 'إضافة وإدارة المنتجات', es: 'Agregar y gestionar productos' },
  categories_mgmt:    { en: '🗂️ Categories',   fr: '🗂️ Catégories',     ar: '🗂️ الفئات',         es: '🗂️ Categorías' },
  categories_desc:    { en: 'Manage product categories', fr: 'Gérer les catégories de produits', ar: 'إدارة فئات المنتجات', es: 'Gestionar categorías de productos' },
  stock_mgmt:         { en: '📥 Stock',       fr: '📥 Stock',          ar: '📥 المخزون',         es: '📥 Stock' },
  stock_desc:         { en: 'Receive new inventory', fr: 'Recevoir de nouveaux stocks', ar: 'استلام مخزون جديد', es: 'Recibir nuevo inventario' },
  adjustments_mgmt:   { en: '🔧 Adjustments', fr: '🔧 Ajustements',   ar: '🔧 التعديلات',       es: '🔧 Ajustes' },
  adjustments_desc:   { en: 'Shrinkage & damage', fr: 'Pertes et dommages', ar: 'نقص وتلف',       es: 'Mermas y daños' },
  price_rules:        { en: '🏷️ Price Rules', fr: '🏷️ Règles de prix', ar: '🏷️ قواعد الأسعار',  es: '🏷️ Reglas de precios' },
  price_rules_desc:   { en: 'Deals & promotions', fr: 'Offres et promotions', ar: 'عروض وتخفيضات', es: 'Ofertas y promociones' },
  users_mgmt:         { en: '👥 Users',        fr: '👥 Utilisateurs',   ar: '👥 المستخدمون',      es: '👥 Usuarios' },
  users_desc:         { en: 'Manage staff accounts', fr: 'Gérer les comptes du personnel', ar: 'إدارة حسابات الموظفين', es: 'Gestionar cuentas del personal' },
  statistics:         { en: '📈 Statistics',   fr: '📈 Statistiques',   ar: '📈 الإحصائيات',      es: '📈 Estadísticas' },
  statistics_desc:    { en: 'Daily, monthly & yearly analytics', fr: 'Analyses quotidiennes, mensuelles et annuelles', ar: 'تحليلات يومية، شهرية وسنوية', es: 'Análisis diario, mensual y anual' },
  reports:            { en: '📊 Reports',      fr: '📊 Rapports',       ar: '📊 التقارير',        es: '📊 Informes' },
  reports_desc:       { en: 'Revenue & profit', fr: 'Revenus et bénéfices', ar: 'الإيرادات والأرباح', es: 'Ingresos y ganancias' },
  tax_categories:     { en: '🧾 Tax',          fr: '🧾 Taxes',          ar: '🧾 الضرائب',         es: '🧾 Impuestos' },
  tax_categories_desc:{ en: 'Tax categories', fr: 'Catégories fiscales', ar: 'فئات الضرائب',     es: 'Categorías fiscales' },
  settings_mgmt:      { en: '⚙️ Settings',     fr: '⚙️ Paramètres',     ar: '⚙️ الإعدادات',      es: '⚙️ Configuración' },
  settings_desc:      { en: 'Currency & theme', fr: 'Devise et thème', ar: 'العملة والمظهر',     es: 'Moneda y tema' },

  // ── POS Terminal ──────────────────────────────────────────────────────
  pos_page_title:     { en: '💻 Web POS Terminal', fr: '💻 Terminal POS Web', ar: '💻 نقطة البيع الإلكترونية', es: '💻 Terminal POS Web' },
  pos_back_dashboard: { en: '← Dashboard',         fr: '← Tableau de bord',   ar: '← لوحة التحكم',              es: '← Panel' },
  pos_search_ph:      { en: 'Search product or category…', fr: 'Rechercher un produit ou catégorie…', ar: 'ابحث عن منتج أو فئة…', es: 'Buscar producto o categoría…' },
  pos_loading:        { en: 'Loading catalog…',     fr: 'Chargement du catalogue…', ar: 'جار تحميل الكتالوج…',       es: 'Cargando catálogo…' },
  pos_current_sel:    { en: '🧾 Current Selection', fr: '🧾 Sélection en cours',    ar: '🧾 التحديد الحالي',          es: '🧾 Selección actual' },
  pos_no_items:       { en: 'No items selected',    fr: 'Aucun article sélectionné', ar: 'لا توجد عناصر محددة',      es: 'Sin artículos seleccionados' },
  pos_tax:            { en: 'Tax',                  fr: 'Taxe',                      ar: 'الضريبة',                   es: 'Impuesto' },
  pos_total:          { en: 'Total',                fr: 'Total',                     ar: 'الإجمالي',                  es: 'Total' },
  pos_finalize:       { en: 'Finalize Sale',        fr: 'Finaliser la vente',        ar: 'إتمام البيع',               es: 'Finalizar venta' },
  pos_processing:     { en: 'Processing…',          fr: 'Traitement…',               ar: 'جار المعالجة…',             es: 'Procesando…' },
  pos_clear:          { en: 'Clear Basket',         fr: 'Vider le panier',           ar: 'تفريغ السلة',               es: 'Vaciar cesta' },
  pos_insufficient_stock: { en: 'Insufficient stock!', fr: 'Stock insuffisant !', ar: 'المخزون غير كافٍ!',          es: '¡Stock insuficiente!' },
  pos_out_of_stock:   { en: 'Out of stock!',        fr: 'Rupture de stock !',        ar: 'نفد المخزون!',              es: '¡Sin existencias!' },
  pos_qty_available:  { en: 'Only {n} units available in stock!', fr: 'Seulement {n} unités en stock !', ar: 'يتوفر {n} وحدة فقط في المخزون!', es: '¡Solo {n} unidades disponibles en stock!' },
  pos_sale_ok:        { en: 'Sale completed successfully! Transaction ID: ', fr: 'Vente réalisée avec succès ! ID de transaction : ', ar: 'تمت عملية البيع بنجاح! رقم المعاملة: ', es: '¡Venta completada con éxito! ID de transacción: ' },
  pos_qty_label:      { en: 'Qty:',                 fr: 'Qté :',                     ar: 'الكمية:',                   es: 'Cant.:' },

  // ── Settings page ─────────────────────────────────────────────────────
  settings_page_title:    { en: '⚙️ Store Settings',           fr: '⚙️ Paramètres du magasin',     ar: '⚙️ إعدادات المتجر',            es: '⚙️ Configuración de la tienda' },
  settings_currency_h:    { en: '💱 Currency',                 fr: '💱 Devise',                    ar: '💱 العملة',                     es: '💱 Moneda' },
  settings_currency_desc: { en: 'Select the currency displayed to all customers site-wide.', fr: 'Sélectionnez la devise affichée à tous les clients sur le site.', ar: 'اختر العملة المعروضة لجميع العملاء على الموقع.', es: 'Selecciona la moneda que se muestra a todos los clientes.' },
  settings_currency_prev: { en: 'Preview:',                   fr: 'Aperçu :',                     ar: 'معاينة:',                       es: 'Vista previa:' },
  settings_theme_h:       { en: '🎨 Default Theme',           fr: '🎨 Thème par défaut',          ar: '🎨 السمة الافتراضية',           es: '🎨 Tema predeterminado' },
  settings_theme_desc:    { en: 'This theme applies to all users who have not set a personal preference.', fr: 'Ce thème s\'applique à tous les utilisateurs qui n\'ont pas défini de préférence personnelle.', ar: 'تُطبَّق هذه السمة على جميع المستخدمين الذين لم يختاروا تفضيلاً شخصياً.', es: 'Este tema se aplica a todos los usuarios que no han establecido una preferencia personal.' },
  settings_back:          { en: '← Back',                     fr: '← Retour',                     ar: '← رجوع',                        es: '← Atrás' },
  settings_save:          { en: '💾 Save Settings',           fr: '💾 Enregistrer',               ar: '💾 حفظ الإعدادات',              es: '💾 Guardar configuración' },
  settings_saving:        { en: 'Saving…',                    fr: 'Enregistrement…',              ar: 'جار الحفظ…',                    es: 'Guardando…' },
  settings_saved:         { en: '✓ Settings saved successfully!', fr: '✓ Paramètres enregistrés !', ar: '✓ تم حفظ الإعدادات!',         es: '✓ ¡Configuración guardada!' },
  settings_err_save:      { en: 'Failed to save settings.',   fr: 'Échec de l\'enregistrement.', ar: 'فشل حفظ الإعدادات.',            es: 'Error al guardar la configuración.' },
  settings_err_network:   { en: 'Network error. Please try again.', fr: 'Erreur réseau. Veuillez réessayer.', ar: 'خطأ في الشبكة. حاول مجدداً.', es: 'Error de red. Inténtelo de nuevo.' },

  // ── Generic ───────────────────────────────────────────────────────────
  server_error:       { en: 'Server error. Please try again.', fr: 'Erreur serveur. Veuillez réessayer.', ar: 'خطأ في الخادم. حاول مجدداً.', es: 'Error del servidor. Inténtelo de nuevo.' },
  copyright:          { en: 'Copyright',    fr: 'Droits réservés', ar: 'جميع الحقوق محفوظة', es: 'Derechos reservados' },
  terms:              { en: 'Terms of Service', fr: 'Conditions d\'utilisation', ar: 'شروط الخدمة', es: 'Términos de servicio' },
  privacy:            { en: 'Privacy Policy', fr: 'Politique de confidentialité', ar: 'سياسة الخصوصية', es: 'Política de privacidad' },
  agree_terms:        { en: 'I agree to the Terms of Service and Privacy Policy, and consent to data processing (GDPR, CCPA, PIPEDA, Law 18-07).', fr: 'J\'accepte les Conditions d\'utilisation et la Politique de confidentialité, et je consens au traitement des données (RGPD, CCPA, LPRPDE, Loi 18-07).', ar: 'أوافق على شروط الخدمة وسياسة الخصوصية، وأوافق على معالجة البيانات.', es: 'Acepto los Términos de servicio y la Política de privacidad, y doy mi consentimiento para el procesamiento de datos (RGPD, CCPA, PIPEDA, Ley 18-07).' },
  cookie_consent:     { en: 'We use cookies to ensure you get the best experience on our website according to EU, US, CA and DZ regulations.', fr: 'Nous utilisons des cookies pour vous garantir la meilleure expérience sur notre site.', ar: 'نحن نستخدم ملفات تعريف الارتباط لضمان حصولك على أفضل تجربة.', es: 'Utilizamos cookies para garantizarle la mejor experiencia en nuestro sitio web según las normativas de la UE, EE.UU., CA y DZ.' },
  accept_cookies:     { en: 'Accept', fr: 'Accepter', ar: 'قبول', es: 'Aceptar' },
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
  if (lang.startsWith('es')) return 'es';
  return 'en';
}

function normalise(code: string | null | undefined): LangCode {
  const c = (code || '').toLowerCase().trim().slice(0, 2) as LangCode;
  return ['en', 'fr', 'ar', 'es'].includes(c) ? c : 'en';
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
