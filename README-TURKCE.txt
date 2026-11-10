ALPSPORT - KURULUM VE YÖNETİM REHBERİ
=====================================

1. PROJE HAKKINDA

AlpSport, canlı ve yaklaşan spor karşılaşmalarını
göstermek için hazırlanmış bir web sitesidir.

Ziyaretçiler:
- Karşılaşmaları görüntüleyebilir.
- Canlı karşılaşmaları izleyebilir.
- Yaklaşan karşılaşmaları görebilir.

Yönetici:
- Yönetici paneline giriş yapabilir.
- Karşılaşma ekleyebilir.
- Karşılaşmaları düzenleyebilir.
- Karşılaşmaları silebilir.
- Takım bilgilerini ve logolarını ekleyebilir.
- Yayın adreslerini sisteme kaydedebilir.

2. GITHUB DOSYA YAPISI

Projenin dosya yapısı şu şekilde olmalıdır:

index.html
admin.html
schema.sql

functions/
    _lib/
        auth.js
    api/
        login.js
        logout.js
        me.js
        matches.js

README-TURKCE.txt

3. CLOUDFLARE D1 VERİTABANI

Cloudflare hesabına gir.

Workers & Pages bölümünü aç.

D1 SQL Database bölümüne gir.

Yeni veritabanı oluştur.

Veritabanı adı:

alpsport-db

Veritabanını oluşturduktan sonra SQL Console bölümünü aç.

GitHub'daki schema.sql dosyasının içindeki kodların
tamamını SQL Console alanına yapıştır.

Çalıştır düğmesine bas.

4. VERİTABANI BAĞLANTISI

Cloudflare Pages projesini aç.

Settings bölümüne gir.

Functions bölümünü aç.

D1 Database Bindings alanına gir.

Yeni bağlantı ekle.

Değişken adı:

DB

Oluşturduğun veritabanını seç.

Kaydet.

5. YÖNETİCİ GİRİŞ BİLGİLERİ

Cloudflare Pages projesinde:

Settings
Environment variables

bölümüne gir.

Aşağıdaki üç değişkeni ekle:

ADMIN_USERNAME
Yönetici kullanıcı adın.

ADMIN_PASSWORD
Yönetici şifren.

SESSION_SECRET
En az 32 karakterden oluşan rastgele ve gizli bir anahtar.

ÖNEMLİ:
Bu bilgileri HTML veya JavaScript dosyalarına yazma.
Sadece Cloudflare ortam değişkenleri bölümünde sakla.

6. YÖNETİCİ PANELİ

Site adresinin sonuna şu yolu ekle:

/admin.html

Örnek:

https://alpsportt.pages.dev/admin.html

Yönetici kullanıcı adı ve şifresiyle giriş yap.

7. YAYIN EKLEME

Yönetici panelinde:

- Karşılaşma başlığını yaz.
- Ev sahibi takımı gir.
- Deplasman takımını gir.
- Takım logolarını ekle.
- Karşılaşma tarihini belirle.
- Yayın adresini gir.
- Durumu seç.
- Kaydet.

Canlı yayın adresleri HTTPS kullanmalıdır.

8. GÜVENLİK

- Yönetici işlemleri sunucu tarafında doğrulanmalıdır.
- Yönetici şifresi ziyaretçilere gösterilmemelidir.
- SESSION_SECRET gizli tutulmalıdır.
- Yayın adresleri tarayıcıya gönderildiğinde
  teknik olarak ziyaretçiler tarafından görülebilir.

9. SON KONTROL

Kurulum tamamlandıktan sonra:

- Ana sayfayı aç.
- Yönetici panelini aç.
- Yönetici girişi yap.
- Test karşılaşması ekle.
- Karşılaşmanın ana sayfada göründüğünü kontrol et.
- Düzenleme ve silme işlemlerini dene.
- Canlı yayın oynatıcısını test et.

ALPSPORT
Canlı Spor Merkezi
