"""
locale.py — Internationalisation support for the AKLI POS App.

Priority:
  1. The authenticated user's preferred_lang (from DB, e.g. 'en', 'fr', 'ar').
  2. The Windows / system locale (detected at startup as fallback for the
     pre-login screens).

Supported codes: 'en', 'fr', 'ar'
"""

import locale as _sys_locale

# ---------------------------------------------------------------------------
# Translation table
# ---------------------------------------------------------------------------
TRANSLATIONS: dict[str, dict[str, str]] = {
    # ── Login / Registration ──────────────────────────────────────────────
    "app_title":                    {"en": "AKLI Shopping Manager", "fr": "Gestionnaire de Boutique AKLI", "ar": "مدير متجر أكلي"},
    "username":                     {"en": "Username",              "fr": "Nom d'utilisateur",             "ar": "اسم المستخدم"},
    "password":                     {"en": "Password",              "fr": "Mot de passe",                  "ar": "كلمة المرور"},
    "sign_in":                      {"en": "Sign In",               "fr": "Se connecter",                  "ar": "تسجيل الدخول"},
    "register":                     {"en": "Register",              "fr": "S'inscrire",                    "ar": "تسجيل"},
    "register_admin":               {"en": "Register Administrator","fr": "Inscrire un administrateur",    "ar": "تسجيل مسؤول"},
    "first_name":                   {"en": "First Name",            "fr": "Prénom",                        "ar": "الاسم الأول"},
    "last_name":                    {"en": "Last Name",             "fr": "Nom de famille",                "ar": "اسم العائلة"},
    "email":                        {"en": "Email",                 "fr": "Courriel",                      "ar": "البريد الإلكتروني"},
    "preferred_lang":               {"en": "Preferred Language",   "fr": "Langue préférée",               "ar": "اللغة المفضلة"},
    "all_fields_required":          {"en": "All fields are required.",               "fr": "Tous les champs sont obligatoires.",    "ar": "جميع الحقول مطلوبة."},
    "username_email_exists":        {"en": "Username or email already exists.",      "fr": "Nom d'utilisateur ou courriel déjà utilisé.", "ar": "اسم المستخدم أو البريد الإلكتروني مستخدم بالفعل."},
    "registration_success":         {"en": "Administrator registered successfully. You can now log in.", "fr": "Administrateur enregistré avec succès. Vous pouvez maintenant vous connecter.", "ar": "تم تسجيل المسؤول بنجاح. يمكنك الآن تسجيل الدخول."},
    "registration_failed":          {"en": "Registration failed. See console for details.", "fr": "Échec de l'inscription. Voir la console pour les détails.", "ar": "فشل التسجيل. راجع وحدة التحكم للتفاصيل."},
    "username_password_required":   {"en": "Username and password are required.",   "fr": "Le nom d'utilisateur et le mot de passe sont requis.", "ar": "اسم المستخدم وكلمة المرور مطلوبان."},
    "invalid_credentials":          {"en": "Invalid username or password.",          "fr": "Nom d'utilisateur ou mot de passe invalide.", "ar": "اسم المستخدم أو كلمة المرور غير صحيحة."},
    "account_deactivated":          {"en": "Account is deactivated. Contact administrator.", "fr": "Compte désactivé. Contactez un administrateur.", "ar": "الحساب معطّل. تواصل مع المسؤول."},
    "db_error":                     {"en": "Database error",        "fr": "Erreur de base de données",     "ar": "خطأ في قاعدة البيانات"},

    # ── Sales window ─────────────────────────────────────────────────────
    "sales_title":                  {"en": "Sales",                 "fr": "Ventes",                        "ar": "المبيعات"},
    "cashier":                      {"en": "Cashier",               "fr": "Caissier",                      "ar": "الصراف"},
    "refund_mode_off":              {"en": "🔄 Refund Mode: OFF",    "fr": "🔄 Mode remboursement : OFF",   "ar": "🔄 وضع الاسترداد: إيقاف"},
    "refund_mode_on":               {"en": "🔄 Refund Mode: ON",     "fr": "🔄 Mode remboursement : ON",    "ar": "🔄 وضع الاسترداد: تشغيل"},
    "manage_pickups":               {"en": "📦 Manage & Validate Web Pickups", "fr": "📦 Gérer les retraits web", "ar": "📦 إدارة وتحقق الاستلام"},
    "orders_dashboard":             {"en": "📋 Web Orders Dashboard","fr": "📋 Tableau de bord des commandes web", "ar": "📋 لوحة طلبات الويب"},
    "inventory_adjustments":        {"en": "⚙️ Inventory Adjustments (Receive Stock)", "fr": "⚙️ Ajustements d'inventaire (Réception)", "ar": "⚙️ تعديلات المخزون (استلام البضاعة)"},
    "search_product":               {"en": "Search Product:",       "fr": "Rechercher un produit :",       "ar": "بحث عن منتج:"},
    "refresh":                      {"en": "🔄 Refresh",            "fr": "🔄 Actualiser",                 "ar": "🔄 تحديث"},
    "product":                      {"en": "Product",               "fr": "Produit",                       "ar": "المنتج"},
    "category":                     {"en": "Category",              "fr": "Catégorie",                     "ar": "الفئة"},
    "price_da":                     {"en": "Price (DA)",            "fr": "Prix (DA)",                     "ar": "السعر (د.ج)"},
    "stock":                        {"en": "Stock",                 "fr": "Stock",                         "ar": "المخزون"},
    "double_click_hint":            {"en": "Double-click to add to cart", "fr": "Double-cliquer pour ajouter au panier", "ar": "انقر مرتين للإضافة إلى السلة"},
    "current_sale":                 {"en": "Current Sale",          "fr": "Vente en cours",                "ar": "البيع الحالي"},
    "item":                         {"en": "Item",                  "fr": "Article",                       "ar": "المنتج"},
    "qty":                          {"en": "Qty",                   "fr": "Qté",                           "ar": "الكمية"},
    "price":                        {"en": "Price",                 "fr": "Prix",                          "ar": "السعر"},
    "tax":                          {"en": "Tax",                   "fr": "Taxe",                          "ar": "الضريبة"},
    "remove_selected":              {"en": "Remove Selected",       "fr": "Retirer la sélection",          "ar": "إزالة المحدد"},
    "total":                        {"en": "TOTAL: {amount} DA",   "fr": "TOTAL : {amount} DA",           "ar": "المجموع: {amount} د.ج"},
    "checkout_print":               {"en": "✅ Checkout & Print Receipt", "fr": "✅ Valider et imprimer le reçu", "ar": "✅ الدفع وطباعة الإيصال"},
    "clear_cart":                   {"en": "🗑 Clear Cart",          "fr": "🗑 Vider le panier",            "ar": "🗑 مسح السلة"},
    "empty_cart":                   {"en": "Empty Cart",            "fr": "Panier vide",                   "ar": "السلة فارغة"},
    "add_items_first":              {"en": "Add items before checking out.", "fr": "Ajoutez des articles avant de valider.", "ar": "أضف عناصر قبل المتابعة."},
    "not_enough_stock":             {"en": "Not Enough Stock",      "fr": "Stock insuffisant",             "ar": "المخزون غير كافٍ"},
    "quantity_for":                 {"en": "Quantity for {name}:",  "fr": "Quantité pour {name} :",        "ar": "الكمية لـ {name}:"},
    "only_n_available":             {"en": "Only {n} available for '{name}'.", "fr": "Seulement {n} disponible(s) pour « {name} ».", "ar": "متوفر {n} فقط من « {name} »."},
    "sale_complete":                {"en": "Sale Complete",         "fr": "Vente complète",                "ar": "اكتملت عملية البيع"},
    "transaction_saved":            {"en": "Transaction #{id} saved!\nReceipt: {file}", "fr": "Transaction #{id} enregistrée !\nReçu : {file}", "ar": "تم حفظ المعاملة #{id}!\nالإيصال: {file}"},
    "checkout_error":               {"en": "Checkout Error",        "fr": "Erreur lors de la validation",  "ar": "خطأ في الدفع"},

    # ── Web Orders Dashboard ──────────────────────────────────────────────
    "web_orders_title":             {"en": "💻 Web Orders Dashboard", "fr": "💻 Tableau de bord des commandes web", "ar": "💻 لوحة طلبات الويب"},
    "auto_refresh":                 {"en": "Auto-refreshes every 30 s", "fr": "Actualisation auto toutes les 30 s", "ar": "تحديث تلقائي كل 30 ث"},
    "filter":                       {"en": "Filter:",               "fr": "Filtrer :",                     "ar": "التصفية:"},
    "all":                          {"en": "All",                   "fr": "Tout",                          "ar": "الكل"},
    "pending":                      {"en": "Pending",               "fr": "En attente",                    "ar": "قيد الانتظار"},
    "ready_for_pickup":             {"en": "Ready for Pickup",      "fr": "Prêt pour retrait",             "ar": "جاهز للاستلام"},
    "completed":                    {"en": "Completed",             "fr": "Terminée",                      "ar": "مكتملة"},
    "order_num":                    {"en": "Order #",               "fr": "Commande #",                    "ar": "طلب #"},
    "client":                       {"en": "Client",                "fr": "Client",                        "ar": "العميل"},
    "status":                       {"en": "Status",                "fr": "Statut",                        "ar": "الحالة"},
    "items":                        {"en": "Items",                 "fr": "Articles",                      "ar": "المنتجات"},
    "date":                         {"en": "Date",                  "fr": "Date",                          "ar": "التاريخ"},
    "mark_ready":                   {"en": "✅ Mark Ready for Pickup", "fr": "✅ Marquer prêt pour retrait", "ar": "✅ علامة جاهز للاستلام"},
    "mark_completed":               {"en": "🏁 Mark Completed",     "fr": "🏁 Marquer terminée",           "ar": "🏁 علامة مكتملة"},
    "refresh_now":                  {"en": "🔄 Refresh Now",        "fr": "🔄 Actualiser maintenant",      "ar": "🔄 تحديث الآن"},
    "no_selection":                 {"en": "No Selection",          "fr": "Aucune sélection",              "ar": "لا يوجد تحديد"},
    "select_order_first":           {"en": "Select an order first.", "fr": "Sélectionnez une commande d'abord.", "ar": "اختر طلبًا أولاً."},
    "order_completed":              {"en": "Web Order #{id} picked up!\nTransaction #{tx} saved.", "fr": "Commande web #{id} retirée !\nTransaction #{tx} enregistrée.", "ar": "تم استلام الطلب #{id}!\nتم حفظ المعاملة #{tx}."},
    "completed_title":              {"en": "Completed",             "fr": "Terminé",                       "ar": "مكتمل"},
    "update_error":                 {"en": "Update Error",          "fr": "Erreur de mise à jour",         "ar": "خطأ في التحديث"},

    # ── Inventory adjustment window ───────────────────────────────────────
    "inventory_adj_title":          {"en": "Inventory Adjustments", "fr": "Ajustements d'inventaire",     "ar": "تعديلات المخزون"},
    "success":                      {"en": "Success",               "fr": "Succès",                        "ar": "نجاح"},
    "error":                        {"en": "Error",                 "fr": "Erreur",                        "ar": "خطأ"},
}

# ---------------------------------------------------------------------------
# Language detection helpers
# ---------------------------------------------------------------------------

def _system_lang() -> str:
    """
    Detect the OS/system locale and map it to one of our supported codes.
    Returns 'en', 'fr', or 'ar'.
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
    except Exception:
        pass
    return "en"


# Module-level active language (can be changed at runtime).
_active_lang: str = _system_lang()


def set_lang(lang: str) -> None:
    """Switch the active language.  'en', 'fr', 'ar' are supported."""
    global _active_lang
    if lang in ("en", "fr", "ar"):
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
