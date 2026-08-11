# FaceKey yüz doğrulama mimarisi

Bu belge, FaceKey uygulamasındaki isteğe bağlı on-device yüz doğrulama akışını teknik olarak özetler. Hukuki tavsiye değildir; KVKK ve biyometrik veri değerlendirmesi hukuk ekibi tarafından yapılmalıdır.

## Durum

Bu implementasyon bir **demo/evaluasyon build** akışıdır.

- Üretim dağıtımına hazır değildir.
- Bağımsız liveness/PAD sertifikası yoktur.
- Kullanılan FaceNet ağırlıkları production veya ticari dağıtım için onaylanmamıştır.
- Demo model yalnızca development JavaScript build'lerinde çalışacak şekilde korunmuştur.

## Temel mimari

Akış yalnızca cihaz üzerinde çalışır:

1. Kamera ön yüz frame'lerini üretir.
2. Native frame worklet içinde yüz algılama ve embedding çıkarımı yapılır.
3. Ham frame, fotoğraf ve video dosyaya yazılmaz ve ağa gönderilmez.
4. Sadece normalize edilmiş matematiksel embedding hesaplanır.
5. Embedding kullanıcı kimliğiyle cihaz güvenli deposunda saklanır veya kayıtlı embedding'lerle cihazda karşılaştırılır.
6. Başarılı doğrulama yalnızca local demo oturumu açar.

## Kullanılan teknolojiler

| Bileşen                                                                      | Rol                                                              |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `react-native-vision-camera@5.2.2`                                           | Native kamera ve frame output                                    |
| `react-native-vision-camera-face-detector@2.0.6`                             | ML Kit tabanlı yüz algılama, göz durumu, Euler açıları, tracking |
| `react-native-vision-camera-resizer@5.2.2`                                   | GPU tabanlı frame resize/format dönüşümü                         |
| `react-native-fast-tflite@3.0.1`                                             | On-device FaceNet TFLite inference                               |
| `react-native-vision-camera-worklets@5.2.2` + `react-native-worklets@0.11.3` | Senkron native frame processing                                  |
| `react-native-nitro-modules@0.36.5`                                          | Native bridge/Nitro altyapısı                                    |
| `react-native-keychain@10.0.0`                                               | iOS Keychain / Android Keystore tabanlı güvenli depo             |
| Zustand                                                                      | Küçük local auth state yönetimi                                  |

Yeni mimari/native paketleri React Native New Architecture üzerinde çalışmaktadır.

## SDK seçimi

### Mevcut seçim

Mevcut demo provider, açık kaynak FaceNet TFLite + aktif challenge-response yaklaşımıdır.

Bunun nedeni:

- Tamamen on-device çalışması
- RN New Architecture/Nitro ile çalışan açık bileşenler
- UI katmanından izlenebilir inference pipeline
- Provider soyutlaması sayesinde ileride lisanslı SDK ile değiştirilebilir olması
- Lisans ve bütçe bağı olmadan fonksiyonel demo yapılabilmesi

### Önemli sınırlama

ML Kit/VisionCamera Face Detector yalnızca yüz algılama ve landmark/sinyal üretimi yapar. Tek başına güvenli 1:1 identity verification veya sertifikalı liveness sağlamaz.

Ayrıca demo FaceNet model dosyasının pretrained ağırlık provenance ve ticari lisans kaydı eksiktir. Ayrıntı: `MODEL_LICENSE.md`.

### Provider değişimi

`FaceEngine` arayüzü, model kimliği ve embedding işlemlerini soyutlar. Üretimde KBY-AI, Regula, FaceTec gibi lisanslı ve bağımsız PAD/test raporları bulunan bir SDK değerlendirilirse UI tarafındaki rıza, fallback ve silme akışı korunabilir.

SDK adayı seçerken en az şunlar doğrulanmalıdır:

- On-device inference
- iBeta/NIST veya eşdeğer bağımsız değerlendirme
- Passive PAD seviyesi ve saldırı sınıfları
- RN New Architecture desteği
- iOS/Android minimum sürümleri
- Native crash oranı ve aktif bakım durumu
- Lisans ve ücret modeli
- Eğitim verisi/provenance ve ticari kullanım koşulları
- Bias/FAR/FRR ölçüm raporları

## Akışlar

### 1. Kayıt sonrası hızlı giriş seçimi

Kullanıcı e-posta/şifre ile hesap oluşturur. Yüz kurulumu zorunlu değildir ve atlanabilir.

Yüz seçilirse genel koşullardan ayrı bir rıza ekranı açılır.

### 2. Ayrı aydınlatma ve açık rıza

Rıza metni [src/features/faceEnrollment/consent.ts](src/features/faceEnrollment/consent.ts) dosyasında sürümlenir:

- `version`: `demo-draft-v1`
- Aydınlatma metni
- Açık rıza checkbox metni
- “Hukuk onayı bekleyen demo taslağı” etiketi

Checkbox işaretlenmeden enrollment başlamaz. Rıza sürümü ve kabul zamanı template metadata'sına yazılır.

Hukuk ekibi metni değiştirirse bu dosyada yeni bir sürüm kullanılmalıdır.

### 3. Enrollment

Enrollment sırasında:

- Ön kamera izni istenir.
- Tek yüz kontrolü yapılır.
- Minimum yüz büyüklüğü denetlenir.
- Pitch/roll pozisyonu kontrol edilir.
- Rastgele aktif challenge uygulanır:
  1. Göz kırpma
  2. İlk rastgele yöne baş çevirme
  3. Merkeze dönme
  4. Diğer yöne baş çevirme
  5. Tekrar merkeze dönme
- 30 saniyede tamamlanmazsa başarısız olur.
- Takip edilen yüz değişirse başarısız olur.
- Challenge sonrası farklı anlardan beş embedding örneği alınır.
- Algılanan yüz, çevresinde pay bırakılarak kırpılır ve roll açısıyla hizalanır.
- Her örnek L2-normalize edilir.
- Normalize örneklerin ortalaması alınır ve tekrar normalize edilir.
- Template secure store'daki kullanıcı koleksiyonuna eklenir; yalnızca aynı kullanıcının eski kaydı güncellenir.

### 4. Verification

Verification sırasında aynı kalite ve liveness kapıları kullanılır.

- Farklı anlardan beş yeni embedding örneği çıkarılır.
- Ortalama candidate embedding hesaplanır.
- Cihazdaki tüm kayıtlı embedding'lerle cosine similarity hesaplanır ve en yüksek skorlu kişi değerlendirilir.
- Demo eşik: `0.80`
- Eşik sürümü: `demo-cropped-v2`
- Başarılıysa attempt sayacı sıfırlanır ve local demo oturum açılır.
- Başarısızsa attempt sayacı artırılır.

Similarity skoru UI, log, analytics veya store'a yazılmaz.

### 5. Fallback

E-posta/şifre her zaman mevcuttur.

- Kamera izni yoksa
- Ön kamera yoksa
- Model başlatılamazsa
- Template yok/bozuk/uyumsuzsa
- Kullanıcı herhangi bir aşamada isterse

kullanıcı şifre girişine dönebilir.

Yüz doğrulama deneme hakkı sınırsızdır. Başarısız bir denemeden sonra kullanıcı canlılık kontrolünü yeniden başlatabilir.

### 6. Silme ve yeniden kayıt

Ayarlar ekranında:

- Yüz kaydı durumu görüntülenir.
- Kayıt tarihi, rıza sürümü ve rıza tarihi gösterilir.
- “Yüz verimi sil” aksiyonu ayrı bir destructive confirmation ister.
- Template silme sonrasında kaydın kalmadığı tekrar doğrulanır.
- Deneme sayacı temizlenir.
- Kullanıcı çıkış yaptırılmadan yeniden rıza/enrollment adımına yönlendirilir.
- “Yüzümü yeniden kaydet” eski şablonu önceden silmez; yeni enrollment başarıyla tamamlanınca kayıt üzerine yazılır.
- Yeniden kayıt esnasında tekrar açık rıza alınır.

## Depolama

Yüz template'i yalnızca secure storage service üzerinden tutulur.

### iOS

- Keychain
- Erişilebilirlik: `WHEN_UNLOCKED_THIS_DEVICE_ONLY`
- Kayıt cihaz dışına taşınmaz ve yalnızca cihaz açıkken kullanılabilir.

### Android

- `react-native-keychain` Keystore-backed AES-GCM credential storage
- Minimum `SECURE_SOFTWARE`
- Anahtar Android Keystore içinde tutulur.

Her Android cihazda StrongBox/TEE donanımı garanti edilmediği için `SECURE_HARDWARE` zorunlu tutulmamıştır. Üretimde `getSecurityLevel()` ile donanım desteği ölçülüp risk politikasına göre katılaştırılabilir.

### Açıkça kullanılmayan yerler

Yüz verisi için kullanılmaz:

- AsyncStorage
- Düz dosya
- SQLite
- Zustand persistence
- Debug log
- Analytics event
- Crash report payload
- Backend request body

### Template şeması

Şema sürümü `2`'dir:

- Model kimliği
- Embedding boyutu
- Threshold sürümü
- Embedding
- Sahip kullanıcı `id` ve `email`
- Enrollment tarihi
- Rıza sürümü ve tarihi

Parola, backend token, kamera frame'i veya ham görüntü saklanmaz.

Eski/uyumsuz/bozuk template fail-closed davranarak kullanılmaz ve yeniden enrollment ister.

## Ağ ve telemetry incelemesi

Bu projede şu anda yüz verisi taşıyan bir ağ çağrısı yoktur. Mock auth local çalışır.

Kaynak kod incelemesinde Sentry, Firebase Analytics veya özel analytics/crash-reporting SDK bağımlılığı bulunmamaktadır.

Yine de üretimde:

- Tüm ağ log/interceptor listeleri gözden geçirilmelidir.
- Crash SDK breadcrumb'larında `face`, `embedding`, `consent`, `verification`, `camera` değerlerinin serialize edilmesi engellenmelidir.
- React Native hata raporlarına route params/screen state eklenecekse redaction filter yazılmalıdır.
- Ekran görüntüsü/kamera frame telemetry'ye eklenmemelidir.
- Testlerde embedding içerikli error mesajı ve snapshot kullanılmamalıdır.

## Güvenlik sınırları

### Liveness sınırları

Aktif challenge yalnızca demo liveness katmanıdır.

Direndiği sınırlar:

- Basit sabit fotoğraf
- Ekranda oynatılan kısa sabit video (kısmen)
- Yanlış pozisyon, çoklu yüz veya kişi değişimi

Yeterli olmadığı sınırlar:

- Gelişmiş video replay
- Deepfake/injection
- Root/jailbreak üzerinden kamera pipeline manipülasyonu
- Maske/3D fiziksel spoof
- OS/kamera API saldırıları

Üretimde bağımsız test edilmiş passive PAD gereklidir.

### Alignment sınırlaması

Demo embedding input'u tam yüz bounding-box/landmark affine alignment kullanmaz. Mevcut pipeline ortalama kaliteyi sınırlayabilir ve aynı kişide bile skor varyasyonu yaratabilir.

Üretim öncesi göz/kulak landmark tabanlı affine alignment ve cihaz başına doğruluk ölçümü yapılmalıdır.

### Eşik sınırlaması

`0.40` cosine eşiği demo kaynak implementasyonundan alınmış başlangıç değeridir. FAR/FRR kalibrasyonu yoktur.

Üretim öncesi:

- Hedef cihazlarda test
- Farklı ışık/yaş/cinsiyet/cilt tonu grubu ölçümleri
- FRR ve FAR raporları
- Eşik ve challenge UX kararları
- Model/hash/sürüm imzası kontrolü

gerekir.

### Local oturum sınırlaması

Mevcut başarı yalnızca local demo oturum açar. Gerçek backend entegrasyonunda “yüz başarılı” sonucundan sunucuya plain flag göndermek replay attack'a açıktır.

Üretimde önerilen tasarım:

- Device-bound signing key Keystore/Secure Enclave içinde tutulur.
- Enrollment sonrası public key backend'e kaydedilir.
- Backend login sırasında kısa ömürlü challenge üretir.
- Cihaz, on-device yüz doğrulama başarılı olduktan sonra challenge'ı imzalar.
- Backend yalnızca imza doğrulaması yapar.
- Yüz embedding'i hiçbir zaman backend'e çıkmaz.

Bu tasarım henüz uygulanmamıştır.

### Çoklu cihaz

Yüz template'i cihaza bağlıdır ve cihazlar arasında senkronize edilmez. Yeni cihazda yeniden enrollment gerekir. Bu, veri minimizasyonunu destekler fakat çoklu cihaz UX'i kasıtlı olarak yoktur.

### Silme sınırlaması

Keychain/Keystore kaydı uygulama seviyesinde erişilemez hale getirilir ve device-only/non-migrating ayarları yedek/taşıma riskini azaltır. Ancak mobil OS ve flash katmanında forensic fiziksel overwrite uygulama tarafından garanti edilemez.

## Platform konfigürasyonu

### Android

- Minimum SDK: 26
- Kamera izni: `android.permission.CAMERA`
- Ön kamera: `android.hardware.camera.front`, `required="false"`
- Backup: `android:allowBackup="false"`
- Cleartext traffic geliştirme değeri manifest variable üzerinden yönetilir.

### iOS

- `NSCameraUsageDescription` eklidir.
- Local networking ATS izni yalnızca geliştirme Metro erişimi içindir.
- iOS build Windows üzerinde doğrulanamamıştır; macOS ile fiziksel iPhone testi gereklidir.

## Build ve test

Doğrulanan komutlar:

```bash
npm run typecheck
npm run lint
npm run format:check
npm test -- --runInBand
./android/gradlew.bat -p android assembleDebug -PreactNativeArchitectures=arm64-v8a
```

Son doğrulamada Android arm64 debug build başarılıdır.

iOS macOS komutları:

```bash
bundle install
cd ios
bundle exec pod install
cd ..
npm run ios
```

## Üretim öncesi kontrol listesi

- [ ] Demo FaceNet yerine lisans/provenance doğrulanmış model veya ticari SDK kullan
- [ ] Bağımsız PAD/liveness raporunu güvenlik ekibiyle incele
- [ ] Hukuk onaylı aydınlatma ve rıza metinlerini sürümle
- [ ] Yüz için sistem Face ID/touch biyometri ve uygulama içi custom yüz doğrulama ilişkisini hukuk/güvenlik ekibiyle netleştir
- [ ] FAR/FRR ölçümü ve threshold kalibrasyonu yap
- [ ] Landmark affine alignment ekle
- [ ] Backend device-bound challenge/signing tasarımını uygula
- [ ] Crash/analytics redaction testlerini ekle
- [ ] Root/jailbreak/injection risk değerlendirmesi yap
- [ ] iOS ve Android fiziksel cihazlarda çok kullanıcılı uçtan uca test yap
- [ ] Production model hash/imza/sürüm kontrolü ekle
- [ ] Üçüncü taraf bağımlılıklarının lisanslarını legal review'a sun
