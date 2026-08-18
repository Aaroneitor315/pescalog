# CLAUDE.md — BitácoraAR

Contexto rápido del proyecto para futuras sesiones. Evita re-explorar todo el código.

## 1. Qué hace y stack

**BitácoraAR** es una PWA para tripulantes de pesca de altura argentinos (langostino). Registra
viajes/mareas, lleva la libreta de embarco con alertas de vencimiento, calcula liquidaciones de
sueldo por convenio, genera la Planilla oficial de Singladuras (REFOCAPEMM) en PDF y muestra
valores de referencia (precios por especie, dólar).

- **Frontend:** React 18 + Vite 5, Tailwind 3, `lucide-react` (íconos). **Sin TypeScript** (JSX).
- **Backend:** Firebase 12 — Auth (email/password), Firestore, Storage.
- **PWA:** `vite-plugin-pwa` (Workbox). Instalable, offline-first para assets.
- **PDF:** `pdf-lib` (overlay sobre plantilla oficial, lado cliente).
- **OCR:** `tesseract.js` (lectura de códigos por cámara).
- **Gráficos:** `recharts`. **Tests:** `vitest`.
- Deploy: repo GitHub `pescalog`, rama `main` (hosting externo tipo Vercel/Firebase Hosting).

## 2. Arquitectura y carpetas

```
src/
  App.jsx            # Router por estado `tab`, orquesta hooks y pasa props a componentes
  main.jsx           # Root + ErrorBoundary con marca + <ActualizacionPWA/>
  firebase.js        # init de app/auth/db/storage (config inline)
  components/         # UI (un componente por pantalla/panel)
  hooks/              # Acceso a datos y estado (useX → Firestore en tiempo real)
  lib/               # Lógica pura, testeable, sin React ni Firebase
    singladuras.js   # cómputo de singladuras/días (inclusivo)
    embarcos.js      # agrupa viajes en períodos de embarco
    planillaPdf.js   # genera la Planilla REFOCAPEMM (overlay pdf-lib)
    enLetras.js      # monto → texto ("Son pesos: …")
    liquidaciones/   # modelos de liquidación por rol (maquinista.js activo)
firestore.rules      # reglas de seguridad (fuente de verdad del control de acceso)
```

**Patrón de datos:** cada `hooks/useX.js` abre un `onSnapshot` a Firestore y expone
`{ datos, accionesCRUD }`. Los componentes no tocan Firestore directo (salvo casos puntuales).
La **lógica de negocio vive en `lib/`** como funciones puras con tests; los componentes solo
la invocan y renderizan.

**Modelo Firestore:**
- `usuarios/{uid}` — email, timestamps. Subcolecciones/docs por usuario:
  - `.../config/perfil` — sector, rango (categoría), rubro.
  - `.../viajes/{id}` — viaje: barco, fechaEmbarco/Desembarco, fechaSalida/Regreso, puertos, capturas.
  - `.../liquidaciones/{id}` — liquidaciones guardadas.
  - libreta/documentos (nombre, dni, cuil, nroLibreta, documentos con vencimiento).
- `config/{doc}` — **global, lectura para todos, escritura solo admin**: `convenio`, `sponsors`,
  `tarifasMaquinas`.
- `stats/global` — métricas (escribe cualquiera autenticado, lee admin).

## 3. Convenciones de código

- **Idioma:** identificadores, comentarios y UI en **español**. Nombres descriptivos
  (`guardarLiquidacion`, `agruparEmbarcos`).
- **Hooks:** `useNombre()` retorna objeto con datos + funciones. Suscripción con `onSnapshot`,
  cleanup en el `return` del `useEffect`.
- **lib/ puro:** sin imports de React/Firebase; siempre con `*.test.js` al lado (vitest).
- **Estilos:** Tailwind con paleta `navy-*` (fondos oscuros) y acento `cyan`. Clases utilitarias
  reusables en `index.css` (`.card`, `.btn-primary`, `.btn-danger`, `.nav-tab`).
- **Dinero:** formato AR `$ #.###,##` (`toLocaleString('es-AR', …)`). En liquidaciones se
  **redondea cada concepto a centavos** antes de sumar (así el neto coincide al centavo con el
  recibo real).
- **Admin:** `esAdmin(user)` = `user.email === 'alangambacorta7@gmail.com'` (en `hooks/useAdmin.js`).
  El mismo email está en `firestore.rules` (`isAdmin()`) — mantener ambos en sync.
- **Commits:** mensajes en español, imperativo, con prefijo de área (`Planilla:`, `PWA:`, etc.).

## 4. Funcionalidades implementadas

- **Auth** email/password (registro, login, reset). Cualquier email, no solo Gmail.
- **Onboarding** de perfil (sector + rango + rubro) obligatorio antes de usar la app.
- **Dashboard**, **Nuevo viaje / Historial** (carga y cómputo de mareas).
- **Mi Libreta**: datos del tripulante + documentos con **alertas de vencimiento**.
- **Valores**: precios por especie y tipo de cambio (dólar).
- **Calculadora → Liquidación Máquinas**: modelo calibrado contra recibo real, tarifas
  solo-admin, recibo tipo comprobante con Imprimir/PDF. (Marinero/Capitán: placeholders.)
- **Mis Embarcos → Planilla de Singladuras (REFOCAPEMM)**: autocompleta el formulario oficial
  desde los viajes y exporta PDF; vista previa antes de descargar.
- **Lectura por cámara (OCR)** en el panel de máquinas.
- **Panel Admin**: convenio, sponsors, métricas de usuarios, tarifas de Máquinas.
- **Aviso de actualización PWA** (banner "Hay una versión nueva").

## 5. Comandos

```bash
npm run dev       # servidor de desarrollo (Vite)
npm run build     # build de producción a dist/
npm run preview   # sirve el build localmente
npm test          # vitest run (tests de lib/)
npx vitest run src/lib/liquidaciones/maquinista.test.js   # un archivo puntual
```

Deploy: se hace por push a `main` (el hosting reconstruye). No hay script de deploy propio.

## 6. Decisiones técnicas a tener en cuenta

- **Singladuras = inclusivas** (ambas fechas cuentan, `diff + 1`), norma REFOCAPEMM. Fuente única
  en `lib/singladuras.js`. No re-implementar el cómputo en otro lado.
- **Períodos de embarco son implícitos**: no hay entidad "período"; se derivan agrupando viajes por
  `(barco + fechaEmbarco)` en `lib/embarcos.js`.
- **Planilla PDF**: la plantilla oficial es tamaño **oficio (612×1008 pt)**, no A4. El texto se
  dibuja como overlay con `pdf-lib` (origen abajo-izquierda). Las fechas se escriben en partes
  (día/mes/año) para caer sobre las barras `/` pre-impresas. Coordenadas calibradas en `COORDS`
  de `planillaPdf.js` (hay modo `debugGrid`). Descarga por blob+link (no `navigator.share`, que en
  desktop no guardaba).
- **Liquidación**: la captura va en **kg producidos × tarifa**, con split 30/70 (remun/no remun).
  Alistamiento y Tareas escalan **× viajes**; los MAQ.F son **fijos ×1**. Aportes (jubilación,
  INSSJP, obra social) sobre base con **tope previsional**. Tarifas en `config/tarifasMaquinas`,
  no hardcodeadas en el cálculo.
- **PWA**: `registerType: 'prompt'` — el SW nuevo espera y `ActualizacionPWA.jsx` avisa. NO volver
  a `autoUpdate` silencioso (dejaba usuarios con bundle viejo sin ver apartados nuevos).
- **Firestore anti-"pantalla azul"**: usar `getFirestore` simple. Un historial de crashes en hard
  reload se resolvió evitando persistencia multi-tab agresiva y con el ErrorBoundary de `main.jsx`.
  No reintroducir `skipWaiting/clientsClaim` ni persistencia multi-pestaña sin cuidado.
- **Seguridad**: el control real está en `firestore.rules`. `config/*` es lectura pública
  (autenticados) y **escritura solo admin** — ya cubre `tarifasMaquinas`. El gate en la UI es
  cosmético; la regla es la que manda.
- **Marca**: BITÁCORAAR, Clase 9, INPI Acta 4745075 (en trámite).
