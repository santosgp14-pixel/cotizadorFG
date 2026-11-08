# Herramientas – Félix García

Portal estático con accesos a distintas herramientas. Pensado para publicarse en **GitHub Pages** (sin build, solo HTML/CSS/JS).

## Estructura

```
/
├── index.html            ← portal (lista de herramientas)
├── css/portal.css
├── js/herramientas.js    ← REGISTRO de herramientas (editar aquí)
├── js/portal.js
├── img/logo.png          ← recursos compartidos
├── cotizador/            ← Cotizador AJEVEN
│   ├── index.html
│   ├── css/  js/
├── siniestros/           ← Control de Siniestros (Firebase)
│   ├── index.html
│   ├── css/  js/firebase-config.js  js/siniestros.js
├── firestore.rules       ← reglas de seguridad de la base de datos
├── .nojekyll             ← GitHub Pages sirve los archivos tal cual
└── server.js             ← servidor local opcional (node server.js)
```

## Control de Siniestros – configurar Firebase (una sola vez)

1. **Crear proyecto**: https://console.firebase.google.com → *Agregar proyecto* (Analytics no es necesario).
2. **Firestore**: *Compilación → Firestore Database → Crear base de datos* → modo producción → región cercana (ej. `southamerica-east1`).
3. **Authentication**: *Compilación → Authentication → Comenzar → Correo electrónico/contraseña → Habilitar*.
   - Pestaña *Users → Agregar usuario*: tu correo y una contraseña fuerte.
   - Copia el **User UID** que aparece en la lista.
   - *Settings → Dominios autorizados → Agregar dominio*: `USUARIO.github.io` (`localhost` ya viene incluido).
   - Opcional: *Settings → User actions* → desmarcar *Enable create (sign-up)*.
4. **Reglas**: abre `firestore.rules`, reemplaza `TU_UID` por tu UID y pega el contenido en
   *Firestore Database → Reglas → Publicar*.
5. **App web**: *Configuración del proyecto (⚙) → Tus apps → `</>` Web* → registrar → copia el objeto
   `firebaseConfig` en `siniestros/js/firebase-config.js`.

> No hace falta crear índices: la app ordena y filtra en el navegador.
> Los valores de `firebase-config.js` no son secretos; la seguridad la dan las reglas (solo tu UID puede leer/escribir).

## Agregar una herramienta

1. Crear una carpeta, por ejemplo `mi-herramienta/`, con su `index.html`.
   Usar rutas relativas (`../img/logo.png`) y un enlace `../` para volver al portal.
2. Añadir una entrada en `js/herramientas.js`:

```js
{
  id: 'mi-herramienta',
  titulo: 'Mi herramienta',
  descripcion: 'Qué hace.',
  url: 'mi-herramienta/',
  icono: '📊',
  categoria: 'Utilidades',
  estado: 'activo',          // o 'proximamente'
},
```

## Probar localmente

```
node server.js
```
Abrir http://localhost:8080/ (también funciona desde XAMPP: http://localhost/cotizadorFG/).

## Publicar en GitHub Pages

```
git init
git add .
git commit -m "Portal de herramientas"
git branch -M main
git remote add origin https://github.com/USUARIO/REPO.git
git push -u origin main
```

En GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch → `main` / `(root)`**.
El sitio quedará en `https://USUARIO.github.io/REPO/` y el cotizador en `.../REPO/cotizador/`.

> Nota: el repositorio y el sitio son públicos (en cuentas gratuitas). No incluir datos sensibles.

