# Grant Admin Rights Script

Szybki przydział uprawnień administratora dla użytkownika.

## ⚡ Metoda 1: Supabase SQL Editor (Najszybsza)

1. Przejdź do: https://app.supabase.com/
2. Zaloguj się na konto `mrakoczy@wp.pl`
3. Wybierz projekt:
   - **PROD**: `macrochef-prod` (xymudnmqahgayqvpznwz)
   - **TEST**: `macrochef-test` (pcjlrcuyhtqoijtkrlyj)
4. Idź do: **SQL Editor** (lewe menu)
5. Kliknij **New Query**
6. Wklej poniższy kod (zmień `email@example.com` na docelowy e-mail):

```sql
-- Grant Admin role to specific email
UPDATE public.user_profiles
SET role = 'Admin'
WHERE email = 'email@example.com' AND role != 'Admin';

-- If user doesn't have profile yet, create it
INSERT INTO public.user_profiles (user_id, email, role, created_at)
SELECT u.id, u.email, 'Admin', NOW()
FROM auth.users u
WHERE u.email = 'email@example.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_profiles p
    WHERE p.user_id = u.id
  );

-- Verify
SELECT u.id as user_id, u.email, p.role, p.created_at
FROM auth.users u
LEFT JOIN public.user_profiles p ON u.id = p.user_id
WHERE u.email = 'email@example.com';
```

7. Kliknij **Run** (Ctrl+Enter)
8. Powinnaś zobaczyć wynik z `role = 'Admin'`

---

## 💻 Metoda 2: Node.js Script (Dla automatyzacji)

### Wymagania
- Node.js 18+
- Zainstalowane zależności: `npm install` (lub już zainstalowane)

### Użycie

```bash
# Grant admin rights na PROD
node scripts/grant-admin-rights.js --email user@example.com --env PROD

# Grant admin rights na TEST (default)
node scripts/grant-admin-rights.js --email user@example.com --env TEST
```

### Konfiguracja zmiennych środowiskowych

Przed uruchomieniem, ustaw klucze Supabase Service Role:

```bash
# Windows (PowerShell)
$env:SUPABASE_PROD_SERVICE_KEY = "sb_prod_service_key_here"
$env:SUPABASE_TEST_SERVICE_KEY = "sb_test_service_key_here"
node scripts/grant-admin-rights.js --email admin@example.com --env PROD

# Linux/macOS
export SUPABASE_PROD_SERVICE_KEY="sb_prod_service_key_here"
export SUPABASE_TEST_SERVICE_KEY="sb_test_service_key_here"
node scripts/grant-admin-rights.js --email admin@example.com --env PROD
```

### Otrzymanie Service Keys

1. Przejdź do: https://app.supabase.com/
2. Wybierz projekt
3. **Settings** → **API**
4. Skopiuj **Service Role Secret** (pod "Project API keys")
5. Ustaw w zmiennej środowiskowej

---

## 📋 Przykłady

### Przydaj admin dla `mrakoczy@wp.pl` na PROD
```sql
UPDATE public.user_profiles
SET role = 'Admin'
WHERE email = 'mrakoczy@wp.pl';
```

### Przydaj admin dla nowego użytkownika
```sql
INSERT INTO public.user_profiles (user_id, email, role, created_at)
SELECT u.id, u.email, 'Admin', NOW()
FROM auth.users u
WHERE u.email = 'newadmin@example.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_profiles p
    WHERE p.user_id = u.id
  );
```

### Sprawdź wszystkich adminów
```sql
SELECT u.id, u.email, p.role, p.created_at
FROM auth.users u
LEFT JOIN public.user_profiles p ON u.id = p.user_id
WHERE p.role = 'Admin'
ORDER BY p.created_at DESC;
```

---

## 🎯 Dostępne Role

| Rola | Uprawnienia |
|------|------------|
| **Admin** | Import/Create/Edit/Delete recipes, Manage products, Admin panel, ❌ Brak reklam |
| **Tester** | Read-only recipes (global library), ❌ Brak reklam |
| **UserWithAdvertisement** | Read-only recipes, ✅ Reklamy (AdBanner) |

---

## ⚠️ Ważne Uwagi

1. **User musi istnieć** - Użytkownik musi być zarejestrawany w `auth.users` (poprzez signup lub Supabase dashboard)
2. **PROD vs TEST** - Sprawdź czy modyfikujesz właściwy environment
3. **Service Keys** - Nie udostępniaj Service Keys publicznie! Przechowuj je w `.env.local`

---

## 🐛 Troubleshooting

### "User not found"
- Użytkownik nie istnieje w `auth.users`
- Rozwiązanie: Zaloguj go na MacroChef lub utwórz w Supabase dashboard

### "Foreign key violation"
- Spróbowałeś wstawić `user_id` który nie istnieje w `auth.users`
- Rozwiązanie: Upewnij się że email w `auth.users` pasuje do `email` parametru

### "Permission denied"
- Używasz zwykłego klucza (anonKey) zamiast Service Key
- Rozwiązanie: Użyj Service Role Secret key
