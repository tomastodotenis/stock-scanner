# Stock Scanner — Todo Tenis & Running

PWA de control de stock (Firebase + Odoo + Mercado Libre).

## Antes de cada cambio
```
npm install        # solo la primera vez
npm run revisar    # revisión de errores + pruebas con la app real (datos simulados, no toca Firebase)
```
Si algo falla, el comando termina en error y **no se publica**.

## Qué cubren las pruebas
- Stock nunca oculta productos aunque falten en el catálogo (busca en Odoo y avisa si no lo encuentra).
- Traslados, Mapa y Planilla buscan en Odoo si el código no está en el catálogo.
- Planilla: "Juntada" solo marca la fila y no toca el stock.
- Sonido: suena aunque el navegador suspenda/cierre el audio; la pistola lectora lo destraba.
- Peso: `index.html` no puede superar 450 KB ni llevar imágenes incrustadas.

## Publicación
Al subir un cambio a `main`, GitHub corre las pruebas y, si pasan, publica en GitHub Pages
(.github/workflows/publicar.yml). Configuración única: Settings → Pages → Source → **GitHub Actions**.

## Subida manual (si no se usa la publicación automática)
Subir `index.html` **y la carpeta `img/`** (logo y fondo), manteniendo el resto de archivos del repositorio.

## Al agregar una pantalla o corregir un error
Agregar una prueba en `tests/` que reproduzca el caso. Así no vuelve a pasar.
