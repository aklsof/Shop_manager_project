"""
pos_locale.py — Internationalisation support for the AKLI POS App.

Priority:
  1. The authenticated user's preferred_lang (from DB, e.g. 'en', 'fr', 'ar', 'es').
  2. The Windows / system locale (detected at startup as fallback for the
     pre-login screens).

Supported codes: 'en', 'fr', 'ar', 'es'
"""

import locale as _sys_locale

# ---------------------------------------------------------------------------
# Translation table
# ---------------------------------------------------------------------------
TRANSLATIONS: dict[str, dict[str, str]] = {
    # ── Login / Registration ──────────────────────────────────────────────
    "app_title":                  {"en": "AKLI Shopping Manager",             "fr": "Gestionnaire de Boutique AKLI",               "ar": "مدير متجر أكلي",          "es": "Gestor de Tienda AKLI"},
    "username":                   {"en": "Username",                          "fr": "Nom d'utilisateur",                           "ar": "اسم المستخدم",            "es": "Usuario"},
    "password":                   {"en": "Password",                          "fr": "Mot de passe",                                "ar": "كلمة المرور",             "es": "Contraseña"},
    "sign_in":                    {"en": "Sign In",                           "fr": "Se connecter",                                "ar": "تسجيل الدخول",            "es": "Iniciar sesión"},
    "register":                   {"en": "Register",                          "fr": "S'inscrire",                                  "ar": "تسجيل",                   "es": "Registrarse"},
    "register_admin":             {"en": "Register Administrator",            "fr": "Inscrire un administrateur",                  "ar": "تسجيل مسؤول",             "es": "Registrar administrador"},
    "first_name":                 {"en": "First Name",                        "fr": "Prénom",                                      "ar": "الاسم الأول",             "es": "Nombre"},
    "last_name":                  {"en": "Last Name",                         "fr": "Nom de famille",                              "ar": "اسم العائلة",             "es": "Apellido"},
    "email":                      {"en": "Email",                             "fr": "Courriel",                                    "ar": "البريد الإلكتروني",       "es": "Correo electrónico"},
    "preferred_lang":             {"en": "Preferred Language",                "fr": "Langue préférée",                             "ar": "اللغة المفضلة",           "es": "Idioma preferido"},
    "all_fields_required":        {"en": "All fields are required.",          "fr": "Tous les champs sont obligatoires.",           "ar": "جميع الحقول مطلوبة.",     "es": "Todos los campos son obligatorios."},
    "username_email_exists":      {"en": "Username or email already exists.", "fr": "Nom d'utilisateur ou courriel déjà utilisé.", "ar": "اسم المستخدم أو البريد مستخدم بالفعل.", "es": "El usuario o correo ya existe."},
    "registration_success":       {"en": "Administrator registered successfully. You can now log in.", "fr": "Administrateur enregistré avec succès. Vous pouvez maintenant vous connecter.", "ar": "تم تسجيل المسؤول بنجاح. يمكنك الآن تسجيل الدخول.", "es": "Administrador registrado con éxito. Ya puede iniciar sesión."},
    "registration_failed":        {"en": "Registration failed. See console for details.", "fr": "Échec de l'inscription. Voir la console pour les détails.", "ar": "فشل التسجيل. راجع وحدة التحكم للتفاصيل.", "es": "Falló el registro. Vea la consola para detalles."},
    "username_password_required": {"en": "Username and password are required.", "fr": "Le nom d'utilisateur et le mot de passe sont requis.", "ar": "اسم المستخدم وكلمة المرور مطلوبان.", "es": "El usuario y la contraseña son obligatorios."},
    "invalid_credentials":        {"en": "Invalid username or password.",      "fr": "Nom d'utilisateur ou mot de passe invalide.",   "ar": "اسم المستخدم أو كلمة المرور غير صحيحة.", "es": "Usuario o contraseña incorrectos."},
    "account_deactivated":        {"en": "Account is deactivated. Contact administrator.", "fr": "Compte désactivé. Contactez un administrateur.", "ar": "الحساب معطّل. تواصل مع المسؤول.", "es": "Cuenta desactivada. Contacte al administrador."},
    "db_error":                   {"en": "Database error",                    "fr": "Erreur de base de données",                   "ar": "خطأ في قاعدة البيانات",   "es": "Error de base de datos"},
    "client_account_hint":        {"en": "Create client account at:",         "fr": "Créer un compte client sur :",                "ar": "أنشئ حساب عميل على:",     "es": "Crear cuenta de cliente en:"},

    # ── Dashboard ─────────────────────────────────────────────────────────
    "dashboard_title":            {"en": "Admin Dashboard",                   "fr": "Tableau de bord admin",                       "ar": "لوحة التحكم",             "es": "Panel de administración"},
    "welcome_msg":                {"en": "Welcome, {name}!",                  "fr": "Bienvenue, {name} !",                         "ar": "مرحباً، {name}!",          "es": "¡Bienvenido, {name}!"},
    "logout":                     {"en": "Logout",                            "fr": "Déconnexion",                                 "ar": "تسجيل الخروج",            "es": "Cerrar sesión"},
    # card labels
    "card_pos":                   {"en": "💻 POS Terminal",                   "fr": "💻 Terminal POS",                             "ar": "💻 نقطة البيع",           "es": "💻 Terminal POS"},
    "card_pos_desc":              {"en": "Process local sales & checkout",    "fr": "Traiter les ventes locales et les encaissements", "ar": "معالجة المبيعات المحلية", "es": "Procesar ventas locales y cobros"},
    "card_web_orders":            {"en": "🌐 Web Orders",                     "fr": "🌐 Commandes Web",                            "ar": "🌐 طلبات الويب",          "es": "🌐 Pedidos web"},
    "card_web_orders_desc":       {"en": "Ready pickups & complete orders",   "fr": "Commandes prêtes au retrait et terminées",    "ar": "جاهز للاستلام وطلبات مكتملة", "es": "Recogidas listas y pedidos completados"},
    "card_products":              {"en": "📦 Products",                       "fr": "📦 Produits",                                 "ar": "📦 المنتجات",             "es": "📦 Productos"},
    "card_products_desc":         {"en": "Add & manage products",             "fr": "Ajouter et gérer des produits",               "ar": "إضافة وإدارة المنتجات",   "es": "Agregar y gestionar productos"},
    "card_categories":            {"en": "🗂️ Categories",                    "fr": "🗂️ Catégories",                              "ar": "🗂️ الفئات",              "es": "🗂️ Categorías"},
    "card_categories_desc":       {"en": "Manage product categories",         "fr": "Gérer les catégories de produits",            "ar": "إدارة فئات المنتجات",     "es": "Gestionar categorías de productos"},
    "card_stock":                 {"en": "📥 Stock",                          "fr": "📥 Stock",                                    "ar": "📥 المخزون",              "es": "📥 Stock"},
    "card_stock_desc":            {"en": "Receive new inventory",             "fr": "Recevoir de nouveaux stocks",                 "ar": "استلام مخزون جديد",       "es": "Recibir nuevo inventario"},
    "card_adjustments":           {"en": "🔧 Adjustments",                    "fr": "🔧 Ajustements",                              "ar": "🔧 التعديلات",            "es": "🔧 Ajustes"},
    "card_adjustments_desc":      {"en": "Shrinkage & damage",                "fr": "Pertes et dommages",                          "ar": "نقص وتلف",                "es": "Mermas y daños"},
    "card_price_rules":           {"en": "🏷️ Price Rules",                   "fr": "🏷️ Règles de prix",                          "ar": "🏷️ قواعد الأسعار",       "es": "🏷️ Reglas de precios"},
    "card_price_rules_desc":      {"en": "Deals & promotions",                "fr": "Offres et promotions",                        "ar": "عروض وتخفيضات",           "es": "Ofertas y promociones"},
    "card_users":                 {"en": "👥 Users",                          "fr": "👥 Utilisateurs",                             "ar": "👥 المستخدمون",           "es": "👥 Usuarios"},
    "card_users_desc":            {"en": "Manage staff accounts",             "fr": "Gérer les comptes du personnel",              "ar": "إدارة حسابات الموظفين",   "es": "Gestionar cuentas del personal"},
    "card_statistics":            {"en": "📈 Statistics",                     "fr": "📈 Statistiques",                             "ar": "📈 الإحصائيات",           "es": "📈 Estadísticas"},
    "card_statistics_desc":       {"en": "Daily, monthly & yearly analytics", "fr": "Analyses quotidiennes, mensuelles et annuelles", "ar": "تحليلات يومية، شهرية وسنوية", "es": "Análisis diario, mensual y anual"},
    "card_reports":               {"en": "📊 Reports",                        "fr": "📊 Rapports",                                 "ar": "📊 التقارير",             "es": "📊 Informes"},
    "card_reports_desc":          {"en": "Revenue & profit",                  "fr": "Revenus et bénéfices",                        "ar": "الإيرادات والأرباح",       "es": "Ingresos y ganancias"},
    "card_tax":                   {"en": "🧾 Tax",                            "fr": "🧾 Taxes",                                    "ar": "🧾 الضرائب",              "es": "🧾 Impuestos"},
    "card_tax_desc":              {"en": "Tax categories",                    "fr": "Catégories fiscales",                         "ar": "فئات الضرائب",            "es": "Categorías fiscales"},
    "card_settings":              {"en": "⚙️ Settings",                       "fr": "⚙️ Paramètres",                               "ar": "⚙️ الإعدادات",            "es": "⚙️ Configuración"},
    "card_settings_desc":         {"en": "Currency & server config",          "fr": "Devise et configuration serveur",             "ar": "العملة وإعدادات الخادم",  "es": "Moneda y config. del servidor"},
    # low-stock table
    "low_stock_alerts":           {"en": "⚠️ Low Stock Alerts",               "fr": "⚠️ Alertes de stock bas",                     "ar": "⚠️ تنبيهات نقص المخزون", "es": "⚠️ Alertas de stock bajo"},
    "all_stocked":                {"en": "All products are adequately stocked.", "fr": "Tous les produits sont suffisamment en stock.", "ar": "جميع المنتجات متوفرة بشكل كافٍ.", "es": "Todos los productos tienen stock suficiente."},
    "product_name":               {"en": "Product",                           "fr": "Produit",                                     "ar": "المنتج",                  "es": "Producto"},
    "location":                   {"en": "Location",                          "fr": "Emplacement",                                 "ar": "الموقع",                  "es": "Ubicación"},
    "min_threshold":              {"en": "Min Threshold",                     "fr": "Seuil min",                                   "ar": "الحد الأدنى",             "es": "Umbral mínimo"},
    "shortage":                   {"en": "Shortage",                          "fr": "Manque",                                      "ar": "النقص",                   "es": "Faltante"},
    "coming_soon":                {"en": "Coming Soon",                       "fr": "Bientôt disponible",                          "ar": "قريباً",                  "es": "Próximamente"},
    "coming_soon_desc":           {"en": "This module will be available in a future update.", "fr": "Ce module sera disponible dans une prochaine mise à jour.", "ar": "سيكون هذا النموذج متاحًا في تحديث قادم.", "es": "Este módulo estará disponible en una próxima actualización."},

    # ── Admin Shared ──
    "name":                       {"en": "Name",                              "fr": "Nom",                                         "ar": "الاسم",                   "es": "Nombre"},
    "add":                        {"en": "Add",                               "fr": "Ajouter",                                     "ar": "إضافة",                   "es": "Añadir"},
    "edit":                       {"en": "Edit",                              "fr": "Modifier",                                    "ar": "تعديل",                   "es": "Editar"},
    "delete":                     {"en": "Delete",                            "fr": "Supprimer",                                   "ar": "حذف",                     "es": "Eliminar"},
    "save":                       {"en": "Save",                              "fr": "Enregistrer",                                 "ar": "حفظ",                     "es": "Guardar"},
    "cancel":                     {"en": "Cancel",                            "fr": "Annuler",                                     "ar": "إلغاء",                   "es": "Cancelar"},
    "actions":                    {"en": "Actions",                           "fr": "Actions",                                     "ar": "إجراءات",                 "es": "Acciones"},
    "created":                    {"en": "Created",                           "fr": "Créé",                                        "ar": "تم الإنشاء",              "es": "Creado"},
    "confirm_delete":             {"en": "Are you sure you want to delete this?", "fr": "Êtes-vous sûr de vouloir supprimer ceci ?", "ar": "هل أنت متأكد من الحذف؟", "es": "¿Está seguro de querer borrar esto?"},

    # ── Tax Categories ──
    "tax_categories":             {"en": "Tax Categories",                    "fr": "Catégories fiscales",                         "ar": "فئات الضرائب",            "es": "Categorías fiscales"},
    "rate_percent":               {"en": "Rate (%)",                          "fr": "Taux (%)",                                    "ar": "المعدل (%)",              "es": "Tasa (%)"},
    "add_tax_category":           {"en": "Add Tax Category",                  "fr": "Ajouter catégorie fiscale",                   "ar": "إضافة فئة ضريبة",         "es": "Añadir categoría fiscal"},
    "tax_category_created":       {"en": "Tax category created successfully.", "fr": "Catégorie fiscale créée avec succès.",        "ar": "تم إنشاء فئة الضريبة بنجاح.", "es": "Categoría fiscal creada con éxito."},

    # ── Categories ──
    "product_categories":         {"en": "Product Categories",                "fr": "Catégories de produits",                      "ar": "فئات المنتجات",           "es": "Categorías de productos"},
    "add_category":               {"en": "Add Category",                      "fr": "Ajouter catégorie",                           "ar": "إضافة فئة",               "es": "Añadir categoría"},
    "rename":                     {"en": "Rename",                            "fr": "Renommer",                                    "ar": "إعادة تسمية",            "es": "Renombrar"},
    "category_created":           {"en": "Category created successfully.",    "fr": "Catégorie créée avec succès.",                "ar": "تم إنشاء الفئة بنجاح.",    "es": "Categoría creada con éxito."},

    # ── Products ──
    "products_management":        {"en": "Product Management",                "fr": "Gestion des produits",                        "ar": "إدارة المنتجات",           "es": "Gestión de productos"},
    "add_product":                {"en": "Add Product",                       "fr": "Ajouter produit",                             "ar": "إضافة منتج",              "es": "Añadir producto"},
    "default_price":              {"en": "Default Price (DA)",                "fr": "Prix par défaut (DA)",                        "ar": "السعر الافتراضي (د.ج)",   "es": "Precio predeterminado (DA)"},
    "store_location":             {"en": "Store Location",                    "fr": "Emplacement magasin",                         "ar": "موقع المتجر",             "es": "Ubicación de tienda"},
    "min_stock":                  {"en": "Min Stock",                         "fr": "Stock min",                                   "ar": "الحد الأدنى للمخزون",     "es": "Stock mínimo"},
    "description":                {"en": "Description",                       "fr": "Description",                                 "ar": "الوصف",                   "es": "Descripción"},
    "image_url":                  {"en": "Image URL",                         "fr": "URL de l'image",                              "ar": "رابط الصورة",             "es": "URL de imagen"},
    "price":                      {"en": "Price",                             "fr": "Prix",                                        "ar": "السعر",                   "es": "Precio"},
    "tax":                        {"en": "Tax",                               "fr": "Taxe",                                        "ar": "الضريبة",                 "es": "Impuesto"},
    "stock":                      {"en": "Stock",                             "fr": "Stock",                                       "ar": "المخزون",                 "es": "Stock"},
    "product_saved":              {"en": "Product saved successfully.",       "fr": "Produit enregistré avec succès.",             "ar": "تم حفظ المنتج بنجاح.",    "es": "Producto guardado con éxito."},

    # ── Price Rules ──
    "price_rules":                {"en": "Price Rules",                       "fr": "Règles de prix",                              "ar": "قواعد الأسعار",           "es": "Reglas de precios"},
    "add_rule":                   {"en": "Add Rule",                          "fr": "Ajouter règle",                               "ar": "إضافة قاعدة",             "es": "Añadir regla"},
    "rule_type":                  {"en": "Rule Type",                         "fr": "Type de règle",                               "ar": "نوع القاعدة",             "es": "Tipo de regla"},
    "promo_price":                {"en": "Promo Price",                       "fr": "Prix promo",                                  "ar": "سعر الترويج",             "es": "Precio promoción"},
    "start_date":                 {"en": "Start Date",                        "fr": "Date de début",                               "ar": "تاريخ البدء",             "es": "Fecha de inicio"},
    "end_date":                   {"en": "End Date",                          "fr": "Date de fin",                                 "ar": "تاريخ الانتهاء",          "es": "Fecha de fin"},
    "active":                     {"en": "Active",                            "fr": "Actif",                                       "ar": "نشط",                     "es": "Activo"},
    "rule_saved":                 {"en": "Price rule saved successfully.",    "fr": "Règle de prix enregistrée avec succès.",      "ar": "تم حفظ قاعدة السعر بنجاح.", "es": "Regla de precio guardada con éxito."},

    # ── Users ──
    "user_management":            {"en": "User Management",                   "fr": "Gestion des utilisateurs",                    "ar": "إدارة المستخدمين",         "es": "Gestión de usuarios"},
    "add_user":                   {"en": "Add User",                          "fr": "Ajouter utilisateur",                         "ar": "إضافة مستخدم",            "es": "Añadir usuario"},
    "role":                       {"en": "Role",                              "fr": "Rôle",                                        "ar": "الدور",                   "es": "Rol"},
    "user_type":                  {"en": "User Type",                         "fr": "Type d'utilisateur",                          "ar": "نوع المستخدم",            "es": "Tipo de usuario"},
    "language":                   {"en": "Language",                          "fr": "Langue",                                      "ar": "اللغة",                   "es": "Idioma"},
    "status":                     {"en": "Status",                            "fr": "Statut",                                      "ar": "الحالة",                  "es": "Estado"},
    "activate":                   {"en": "Activate",                          "fr": "Activer",                                     "ar": "تفعيل",                   "es": "Activar"},
    "deactivate":                 {"en": "Deactivate",                        "fr": "Désactiver",                                  "ar": "تعطيل",                   "es": "Desactivar"},
    "user_created":               {"en": "User created successfully.",        "fr": "Utilisateur créé avec succès.",               "ar": "تم إنشاء المستخدم بنجاح.", "es": "Usuario creado con éxito."},

    # ── Reports & Statistics ──
    "financial_reports":          {"en": "Financial Reports",                 "fr": "Rapports financiers",                         "ar": "التقارير المالية",         "es": "Informes financieros"},
    "statistics":                 {"en": "Statistics",                        "fr": "Statistiques",                                "ar": "الإحصائيات",              "es": "Estadísticas"},
    "from_date":                  {"en": "From",                              "fr": "De",                                          "ar": "من",                      "es": "Desde"},
    "to_date":                    {"en": "To",                                "fr": "À",                                           "ar": "إلى",                     "es": "Hasta"},
    "filter":                     {"en": "Filter",                            "fr": "Filtrer",                                     "ar": "تصفية",                   "es": "Filtrar"},
    "total_revenue":              {"en": "Total Revenue",                     "fr": "Revenu total",                                "ar": "إجمالي الإيرادات",        "es": "Ingresos totales"},
    "total_cogs":                 {"en": "Total COGS",                        "fr": "Coût total des ventes",                       "ar": "إجمالي تكلفة المبيعات",   "es": "Costo total ventas"},
    "tax_collected":              {"en": "Tax Collected",                     "fr": "Taxe collectée",                              "ar": "الضرائب المحصلة",         "es": "Impuestos recaudados"},
    "net_profit":                 {"en": "Net Profit",                        "fr": "Bénéfice net",                                "ar": "صافي الربح",              "es": "Beneficio neto"},
    "date":                       {"en": "Date",                              "fr": "Date",                                        "ar": "التاريخ",                 "es": "Fecha"},
    "sold":                       {"en": "Sold",                              "fr": "Vendu",                                       "ar": "مباع",                    "es": "Vendido"},
    "refunded":                   {"en": "Refunded",                          "fr": "Remboursé",                                   "ar": "مسترد",                   "es": "Reembolsado"},

    # ── Sales window ─────────────────────────────────────────────────────
    "sales_title":                {"en": "Sales",                             "fr": "Ventes",                                      "ar": "المبيعات",                "es": "Ventas"},
    "cashier":                    {"en": "Cashier",                           "fr": "Caissier",                                    "ar": "الصراف",                  "es": "Cajero"},
    "refund_mode_off":            {"en": "🔄 Refund Mode: OFF",               "fr": "🔄 Mode remboursement : OFF",                 "ar": "🔄 وضع الاسترداد: إيقاف", "es": "🔄 Modo devolución: APAGADO"},
    "refund_mode_on":             {"en": "🔄 Refund Mode: ON",                "fr": "🔄 Mode remboursement : ON",                  "ar": "🔄 وضع الاسترداد: تشغيل", "es": "🔄 Modo devolución: ENCENDIDO"},
    "manage_pickups":             {"en": "📦 Manage & Validate Web Pickups",  "fr": "📦 Gérer les retraits web",                   "ar": "📦 إدارة وتحقق الاستلام", "es": "📦 Gestionar recogidas web"},
    "orders_dashboard":           {"en": "📋 Web Orders Dashboard",           "fr": "📋 Tableau de bord des commandes web",        "ar": "📋 لوحة طلبات الويب",     "es": "📋 Panel de pedidos web"},
    "inventory_adjustments":      {"en": "⚙️ Inventory Adjustments (Receive Stock)", "fr": "⚙️ Ajustements d'inventaire (Réception)", "ar": "⚙️ تعديلات المخزون (استلام البضاعة)", "es": "⚙️ Ajustes de inventario (Recepción)"},
    "search_product":             {"en": "Search Product:",                   "fr": "Rechercher un produit :",                     "ar": "بحث عن منتج:",            "es": "Buscar producto:"},
    "refresh":                    {"en": "🔄 Refresh",                        "fr": "🔄 Actualiser",                               "ar": "🔄 تحديث",                "es": "🔄 Actualizar"},
    "product":                    {"en": "Product",                           "fr": "Produit",                                     "ar": "المنتج",                  "es": "Producto"},
    "category":                   {"en": "Category",                          "fr": "Catégorie",                                   "ar": "الفئة",                   "es": "Categoría"},
    "price_da":                   {"en": "Price (DA)",                        "fr": "Prix (DA)",                                   "ar": "السعر (د.ج)",             "es": "Precio (DA)"},
    "stock":                      {"en": "Stock",                             "fr": "Stock",                                       "ar": "المخزون",                 "es": "Stock"},
    "double_click_hint":          {"en": "Double-click to add to cart",       "fr": "Double-cliquer pour ajouter au panier",       "ar": "انقر مرتين للإضافة إلى السلة", "es": "Doble clic para añadir al carrito"},
    "current_sale":               {"en": "Current Sale",                      "fr": "Vente en cours",                              "ar": "البيع الحالي",            "es": "Venta actual"},
    "item":                       {"en": "Item",                              "fr": "Article",                                     "ar": "المنتج",                  "es": "Artículo"},
    "qty":                        {"en": "Qty",                               "fr": "Qté",                                         "ar": "الكمية",                  "es": "Cant."},
    "price":                      {"en": "Price",                             "fr": "Prix",                                        "ar": "السعر",                   "es": "Precio"},
    "tax":                        {"en": "Tax",                               "fr": "Taxe",                                        "ar": "الضريبة",                 "es": "Impuesto"},
    "remove_selected":            {"en": "Remove Selected",                   "fr": "Retirer la sélection",                        "ar": "إزالة المحدد",            "es": "Eliminar seleccionado"},
    "total":                      {"en": "TOTAL: {amount} DA",                "fr": "TOTAL : {amount} DA",                         "ar": "المجموع: {amount} د.ج",   "es": "TOTAL: {amount} DA"},
    "checkout_print":             {"en": "✅ Checkout & Print Receipt",        "fr": "✅ Valider et imprimer le reçu",               "ar": "✅ الدفع وطباعة الإيصال", "es": "✅ Pagar e imprimir recibo"},
    "clear_cart":                 {"en": "🗑 Clear Cart",                      "fr": "🗑 Vider le panier",                          "ar": "🗑 مسح السلة",             "es": "🗑 Vaciar carrito"},
    "empty_cart":                 {"en": "Empty Cart",                        "fr": "Panier vide",                                 "ar": "السلة فارغة",             "es": "Carrito vacío"},
    "add_items_first":            {"en": "Add items before checking out.",    "fr": "Ajoutez des articles avant de valider.",      "ar": "أضف عناصر قبل المتابعة.", "es": "Añade artículos antes de pagar."},
    "not_enough_stock":           {"en": "Not Enough Stock",                  "fr": "Stock insuffisant",                           "ar": "المخزون غير كافٍ",        "es": "Stock insuficiente"},
    "quantity_for":               {"en": "Quantity for {name}:",              "fr": "Quantité pour {name} :",                      "ar": "الكمية لـ {name}:",        "es": "Cantidad para {name}:"},
    "only_n_available":           {"en": "Only {n} available for '{name}'.",  "fr": "Seulement {n} disponible(s) pour « {name} ».", "ar": "متوفر {n} فقط من « {name} ».", "es": "Solo {n} disponible(s) para '{name}'."},
    "sale_complete":              {"en": "Sale Complete",                     "fr": "Vente complète",                              "ar": "اكتملت عملية البيع",      "es": "Venta completada"},
    "transaction_saved":          {"en": "Transaction #{id} saved!\nReceipt: {file}", "fr": "Transaction #{id} enregistrée !\nReçu : {file}", "ar": "تم حفظ المعاملة #{id}!\nالإيصال: {file}", "es": "¡Transacción #{id} guardada!\nRecibo: {file}"},
    "checkout_error":             {"en": "Checkout Error",                    "fr": "Erreur lors de la validation",                "ar": "خطأ في الدفع",            "es": "Error al pagar"},

    # ── Web Orders Dashboard ──────────────────────────────────────────────
    "web_orders_title":           {"en": "💻 Web Orders Dashboard",           "fr": "💻 Tableau de bord des commandes web",        "ar": "💻 لوحة طلبات الويب",     "es": "💻 Panel de pedidos web"},
    "auto_refresh":               {"en": "Auto-refreshes every 30 s",        "fr": "Actualisation auto toutes les 30 s",          "ar": "تحديث تلقائي كل 30 ث",    "es": "Actualización automática cada 30 s"},
    "filter":                     {"en": "Filter:",                           "fr": "Filtrer :",                                   "ar": "التصفية:",                "es": "Filtrar:"},
    "all":                        {"en": "All",                               "fr": "Tout",                                        "ar": "الكل",                    "es": "Todo"},
    "pending":                    {"en": "Pending",                           "fr": "En attente",                                  "ar": "قيد الانتظار",            "es": "Pendiente"},
    "ready_for_pickup":           {"en": "Ready for Pickup",                  "fr": "Prêt pour retrait",                           "ar": "جاهز للاستلام",           "es": "Listo para recoger"},
    "completed":                  {"en": "Completed",                         "fr": "Terminée",                                    "ar": "مكتملة",                  "es": "Completado"},
    "order_num":                  {"en": "Order #",                           "fr": "Commande #",                                  "ar": "طلب #",                   "es": "Pedido #"},
    "client":                     {"en": "Client",                            "fr": "Client",                                      "ar": "العميل",                  "es": "Cliente"},
    "status":                     {"en": "Status",                            "fr": "Statut",                                      "ar": "الحالة",                  "es": "Estado"},
    "items":                      {"en": "Items",                             "fr": "Articles",                                    "ar": "المنتجات",                "es": "Artículos"},
    "date":                       {"en": "Date",                              "fr": "Date",                                        "ar": "التاريخ",                 "es": "Fecha"},
    "mark_ready":                 {"en": "✅ Mark Ready for Pickup",           "fr": "✅ Marquer prêt pour retrait",                 "ar": "✅ علامة جاهز للاستلام",  "es": "✅ Marcar listo para recoger"},
    "mark_completed":             {"en": "🏁 Mark Completed",                 "fr": "🏁 Marquer terminée",                         "ar": "🏁 علامة مكتملة",         "es": "🏁 Marcar como completado"},
    "refresh_now":                {"en": "🔄 Refresh Now",                    "fr": "🔄 Actualiser maintenant",                    "ar": "🔄 تحديث الآن",           "es": "🔄 Actualizar ahora"},
    "no_selection":               {"en": "No Selection",                      "fr": "Aucune sélection",                            "ar": "لا يوجد تحديد",           "es": "Sin selección"},
    "select_order_first":         {"en": "Select an order first.",            "fr": "Sélectionnez une commande d'abord.",          "ar": "اختر طلبًا أولاً.",         "es": "Seleccione un pedido primero."},
    "order_completed":            {"en": "Web Order #{id} picked up!\nTransaction #{tx} saved.", "fr": "Commande web #{id} retirée !\nTransaction #{tx} enregistrée.", "ar": "تم استلام الطلب #{id}!\nتم حفظ المعاملة #{tx}.", "es": "¡Pedido web #{id} recogido!\nTransacción #{tx} guardada."},
    "completed_title":            {"en": "Completed",                         "fr": "Terminé",                                     "ar": "مكتمل",                   "es": "Completado"},
    "update_error":               {"en": "Update Error",                      "fr": "Erreur de mise à jour",                       "ar": "خطأ في التحديث",          "es": "Error de actualización"},

    # ── Inventory adjustment window ───────────────────────────────────────
    "inventory_adj_title":        {"en": "Inventory Adjustments",             "fr": "Ajustements d'inventaire",                    "ar": "تعديلات المخزون",         "es": "Ajustes de inventario"},
    "success":                    {"en": "Success",                           "fr": "Succès",                                      "ar": "نجاح",                    "es": "Éxito"},
    "error":                      {"en": "Error",                             "fr": "Erreur",                                      "ar": "خطأ",                     "es": "Error"},
}

# ---------------------------------------------------------------------------
# Language detection helpers
# ---------------------------------------------------------------------------

def _system_lang() -> str:
    """
    Detect the OS/system locale and map it to one of our supported codes.
    Returns 'en', 'fr', 'ar', or 'es'.
    """
    try:
        # On Windows this returns e.g. 'French_France.1252' or 'Arabic_Saudi Arabia.1256'
        loc, _ = _sys_locale.getdefaultlocale()
        if loc:
            loc_lower = loc.lower()
            if loc_lower.startswith("fr"):
                return "fr"
            if loc_lower.startswith("ar"):
                return "ar"
            if loc_lower.startswith("es"):
                return "es"
    except Exception:
        pass
    return "en"


# Module-level active language (can be changed at runtime).
_active_lang: str = _system_lang()


def set_lang(lang: str) -> None:
    """Switch the active language. 'en', 'fr', 'ar', 'es' are supported."""
    global _active_lang
    if lang in ("en", "fr", "ar", "es"):
        _active_lang = lang


def get_lang() -> str:
    """Return the currently active language code."""
    return _active_lang


def t(key: str, **kwargs) -> str:
    """
    Translate *key* to the current language.

    Keyword arguments are substituted using str.format_map so that you can
    write, e.g.:
        t("total", amount="12.50")   →  "TOTAL: 12.50 DA"
        t("quantity_for", name="Milk")
    """
    entry = TRANSLATIONS.get(key, {})
    text = entry.get(_active_lang) or entry.get("en") or key
    if kwargs:
        text = text.format_map(kwargs)
    return text
