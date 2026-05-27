## Approach
- Read existing files before writing. Don't re-read unless changed.
- Thorough in reasoning, concise in output.
- Skip files over 100KB unless required.
- No sycophantic openers or closing fluff.
- No emojis or em-dashes.
- Do not guess APIs, versions, flags, commit SHAs, or package names. Verify by reading code or docs before asserting.

## Idioma
- Todas las respuestas deben ser en español.

## Diseño — Paleta de Colores
- Todo cambio de diseño debe usar exclusivamente los colores definidos en `src/styles/globals.css`.
- Usar variables CSS (ej: `var(--orange-primary)`) en lugar de hex hardcodeados.
- Fuente principal: DM Sans.
## 2. Diseño — Paleta de Colores del Proyecto
Cualquier cambio de diseño o integración de diseño nuevo **debe respetar la paleta de colores existente** definida en `Front4/src/styles/globals.css`.

### Paleta obligatoria:
| Token               | Valor     | Uso                              |
|----------------------|-----------|----------------------------------|
| `--black-primary`    | `#212020` | Fondo principal                  |
| `--black-secondary`  | `#111111` | Fondo secundario/inputs          |
| `--gray-darkest`     | `#1a1919` | Cards                            |
| `--gray-darker`      | `#2a2a2a` | Bordes sutiles, popover          |
| `--gray-dark`        | `#3a3a3a` | Bordes principales               |
| `--gray-medium`      | `#333131` | Switches, scrollbar              |
| `--gray-light`       | `#888888` | Texto terciario                  |
| `--gray-lighter`     | `#b0b0b0` | Texto secundario                 |
| `--gray-lightest`    | `#d0d0d0` | Texto párrafos                   |
| `--orange-primary`   | `#d8b081` | Color primario/acento            |
| `--orange-secondary` | `#d8b081` | Color acento secundario          |
| `--orange-darker`    | `#c4a06d` | Hover del acento                 |
| `--white-primary`    | `#FFFFFF` | Texto principal, headings        |
| `--white-secondary`  | `#F5F5F5` | Texto claro alternativo          |
| `--destructive`      | `#DC2626` | Errores, acciones destructivas   |
| `--status-green`     | `#7aab8a` | Estado activo/positivo en tablas |
| `--status-red`       | `#b07070` | Estado inactivo/negativo en tablas|

## Entidades de la API (Ruta protegida)
- Antes de modificar cualquier archivo en `../BarberiaApi-main/Domain/Entities/`, preguntar y esperar aprobacion.
- Despues de modificar una entidad, revisar controladores, DTOs y servicios del modulo afectado.
