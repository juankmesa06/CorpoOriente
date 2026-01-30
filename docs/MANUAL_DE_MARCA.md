# Manual de Marca
## Centro PsicoTerapéutico de Oriente

---

## 1. Identidad Visual

### 1.1 Paleta de Colores Principal

| Nombre | Uso | Hex | HSL | Clase Tailwind |
|--------|-----|-----|-----|----------------|
| **Primary** | Color principal, CTAs, enlaces activos | `#14B8A6` | 173° 80% 40% | `teal-600` |
| **Primary Hover** | Estados hover de botones primarios | `#0D9488` | 173° 80% 35% | `teal-700` |
| **Primary Light** | Fondos suaves, badges | `#CCFBF1` | 166° 76% 97% | `teal-100` |
| **Primary Muted** | Fondos de secciones | `#F0FDFA` | 166° 76% 97% | `teal-50` |
| **Secondary** | Texto oscuro, contraste | `#1E293B` | 217° 33% 17% | `slate-800` |
| **Secondary Dark** | Botones secundarios oscuros | `#0F172A` | 222° 47% 11% | `slate-900` |
| **Neutral** | Texto cuerpo | `#475569` | 215° 16% 47% | `slate-600` |
| **Neutral Light** | Bordes, fondos | `#F1F5F9` | 210° 40% 96% | `slate-100` |
| **White** | Fondos principales | `#FFFFFF` | 0° 0% 100% | `white` |
| **Destructive** | Errores, eliminar | `#EF4444` | 0° 84% 60% | `red-500` |
| **Success** | Confirmaciones, estados activos | `#10B981` | 160° 84% 39% | `emerald-500` |

### 1.2 Degradados Oficiales

| Nombre | Uso | Clases |
|--------|-----|--------|
| **Gradient Primary** | Botones principales, CTAs | `bg-gradient-to-r from-teal-600 to-teal-700` |
| **Gradient Primary Hover** | Hover de botones | `hover:from-teal-700 hover:to-teal-800` |
| **Gradient Hero** | Títulos destacados, acentos | `bg-gradient-to-r from-teal-600 to-emerald-600` |
| **Gradient Card** | Fondos de cards destacadas | `bg-gradient-to-br from-teal-500 via-teal-600 to-cyan-600` |
| **Gradient Soft** | Fondos sutiles | `bg-gradient-to-br from-teal-50 to-white` |
| **Gradient Dark** | Secciones oscuras | `bg-gradient-to-br from-slate-900 to-slate-800` |

---

## 2. Tipografía

### 2.1 Jerarquía

| Nivel | Uso | Clases | Peso |
|-------|-----|--------|------|
| **H1** | Títulos principales | `text-4xl lg:text-6xl font-bold tracking-tight text-slate-900` | Bold |
| **H2** | Títulos de sección | `text-2xl lg:text-3xl font-bold text-slate-900` | Bold |
| **H3** | Subtítulos | `text-xl font-bold text-slate-800` | Bold |
| **H4** | Títulos de card | `text-lg font-bold text-slate-800` | Bold |
| **Body** | Texto normal | `text-base text-slate-600` | Regular |
| **Body Small** | Texto secundario | `text-sm text-slate-500` | Regular |
| **Caption** | Etiquetas, badges | `text-xs font-semibold uppercase tracking-wider text-slate-500` | Semibold |
| **Label** | Labels de formularios | `text-sm font-semibold text-slate-700` | Semibold |

### 2.2 Fuente

- **Familia**: Sistema por defecto (Inter/System UI)
- **Tracking**: `tracking-tight` para títulos, `tracking-normal` para cuerpo
- **Line height**: `leading-relaxed` para párrafos, `leading-tight` para títulos

---

## 3. Botones

### 3.1 Botón Primario (CTA)

```
Clases: btn-brand-primary
- Fondo: Degradado teal-600 → teal-700
- Hover: teal-700 → teal-800
- Texto: blanco, font-semibold
- Bordes: rounded-full (pills) o rounded-xl
- Sombra: shadow-md shadow-teal-600/20
- Altura: h-11 o h-12 para destacados
```

### 3.2 Botón Secundario (Outline)

```
Clases: btn-brand-secondary
- Borde: 2px slate-200
- Fondo: transparente
- Hover: border-teal-600, text-teal-700, bg-teal-50
- Texto: slate-700
- Bordes: rounded-full o rounded-xl
```

### 3.3 Botón Ghost

```
Clases: btn-brand-ghost
- Fondo: transparente
- Hover: bg-slate-50, text-teal-700
- Texto: slate-600
```

### 3.4 Botón Destructivo

```
- Fondo: red-500
- Hover: red-600
- Texto: blanco
```

### 3.5 Tamaños

| Tamaño | Altura | Padding | Uso |
|--------|--------|---------|-----|
| **sm** | h-9 | px-3 | Acciones secundarias |
| **default** | h-10 | px-4 | Botones estándar |
| **lg** | h-12 | px-8 | CTAs principales |
| **xl** | h-14 | px-8 | Hero, landing |

---

## 4. Cards y Contenedores

### 4.1 Card Estándar

```
- Fondo: white
- Borde: border border-slate-100
- Sombra: shadow-sm hover:shadow-md
- Bordes: rounded-2xl
- Padding: p-6
```

### 4.2 Card Destacada

```
- Fondo: white
- Borde: border-slate-100
- Sombra: shadow-xl
- Bordes: rounded-[2rem]
- Acento: borde superior con gradient (opcional)
```

### 4.3 Card con Gradiente

```
- Fondo: bg-gradient-to-br from-slate-50 to-white
- Borde: border-slate-100
- Bordes: rounded-2xl
```

---

## 5. Bordes y Radios

| Elemento | Radio | Clase |
|----------|-------|-------|
| Botones pill | 9999px | `rounded-full` |
| Cards | 1rem | `rounded-xl` |
| Cards grandes | 1.5-2rem | `rounded-2xl` o `rounded-[2rem]` |
| Inputs | 0.75rem | `rounded-xl` |
| Badges | 0.5rem | `rounded-lg` |
| Iconos pequeños | 0.5rem | `rounded-lg` |

---

## 6. Sombras

| Uso | Clase |
|-----|-------|
| Sutil | `shadow-sm` |
| Estándar | `shadow-md` |
| Destacada | `shadow-xl` |
| Hero/Modal | `shadow-2xl` |
| Brand (teal) | `shadow-teal-600/20` |
| Hover brand | `hover:shadow-lg hover:shadow-teal-600/20` |

---

## 7. Espaciado

| Escala | Valor | Uso |
|--------|-------|-----|
| xs | 0.25rem (4px) | Gaps mínimos |
| sm | 0.5rem (8px) | Entre elementos relacionados |
| md | 1rem (16px) | Entre secciones |
| lg | 1.5rem (24px) | Separación de bloques |
| xl | 2rem (32px) | Entre secciones grandes |

---

## 8. Estados Interactivos

### 8.1 Hover

- **Links**: `hover:text-teal-700 hover:bg-teal-50`
- **Botones primarios**: `hover:from-teal-700 hover:to-teal-800`
- **Cards**: `hover:shadow-md hover:border-teal-200`
- **Transición**: `transition-all duration-200`

### 8.2 Focus

- **Inputs**: `focus:ring-2 focus:ring-teal-500 focus:border-teal-500`
- **Botones**: `focus-visible:ring-2 focus-visible:ring-teal-500`

### 8.3 Active

- **Botones**: `active:scale-[0.98]` (opcional)

---

## 9. Iconos

- **Tamaño estándar**: `h-5 w-5` o `h-4 w-4`
- **Tamaño grande**: `h-6 w-6`
- **Color primario**: `text-teal-600`
- **Color neutro**: `text-slate-400` o `text-slate-500`
- **En contenedor**: `p-2 bg-teal-50 rounded-lg text-teal-600`

---

## 10. Badges y Etiquetas

### 10.1 Badge Primario

```
bg-teal-50 text-teal-700 border border-teal-100
```

### 10.2 Badge Success

```
bg-emerald-50 text-emerald-700 border-emerald-100
```

### 10.3 Badge Destructivo

```
bg-red-50 text-red-700 border-red-200
```

### 10.4 Badge Neutro

```
bg-slate-100 text-slate-700 border-slate-200
```

---

## 11. Aplicación por Rol

Todos los roles (Admin, Doctor, Recepcionista, Paciente) deben usar **exactamente** las mismas clases de marca. No hay variaciones por rol.

---

## 12. Clases de Utilidad de Marca

Usar las clases `btn-brand-*` y `card-brand-*` definidas en `index.css` para garantizar consistencia en todo el proyecto.

## 13. Variantes del Componente Button

El componente `Button` incluye variantes de marca:

| Variante | Uso |
|----------|-----|
| `variant="brand"` | Botón primario con degradado teal (pill/rounded-full) |
| `variant="brandSquare"` | Botón primario con degradado (rounded-xl) |
| `variant="brandOutline"` | Botón secundario outline con hover teal |
| `variant="brandGhost"` | Botón ghost con hover teal |
| `variant="secondary"` | Botón oscuro (slate-900) para contraste |

## 14. Archivos de Referencia

- **Variables CSS**: `src/index.css` (variables `--brand-*`)
- **Componente Button**: `src/components/ui/button.tsx`
- **Config Tailwind**: `tailwind.config.ts` (colores `brand`)