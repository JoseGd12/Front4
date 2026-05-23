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

## Entidades de la API (Ruta protegida)
- Antes de modificar cualquier archivo en `../BarberiaApi-main/Domain/Entities/`, preguntar y esperar aprobacion.
- Despues de modificar una entidad, revisar controladores, DTOs y servicios del modulo afectado.
