# PRUEBAS DE CAJA NEGRA - MÓDULO DE REGISTRO

**Proyecto:** Front4 - Sistema de Barbería  
**Módulo:** Registro de Usuarios  
**Fecha:** 2026-05-20  
**Técnicas:** Partición de Equivalencia + Valores Límites  
**Versión:** 1.0

---

## PARTE 1: PLANIFICACIÓN

### 1.1 Objetivo General

Validar que el módulo de registro de usuarios funciona correctamente mediante pruebas de caja negra, asegurando validaciones de campos, mensajes de error apropiados y restricciones de duplicados.

### 1.2 Alcance

| **DENTRO DEL ALCANCE** | **FUERA DEL ALCANCE** |
|---|---|
| ✓ Validación de campos obligatorios | ✗ Login con credenciales creadas |
| ✓ Mensajes de error informativos | ✗ Recuperación de contraseña |
| ✓ Restricción: Usuario duplicado | ✗ Confirmación por email |
| ✓ Creación con rol Cliente | ✗ Integración redes sociales |
| ✓ Restricción: Formato email válido | ✗ Verificación de teléfono |
| ✓ Restricción: Contraseña mínimo 8 caracteres | |

### 1.3 Función Bajo Prueba

```
Interfaz:  POST /api/Auth/register
Método:    registerUser(data: RegistroRequest) -> Promise<RegistroResponse>
```

**RegistroRequest:**
- `nombre` (string, obligatorio)
- `apellido` (string, obligatorio)
- `email` (string, obligatorio, único, formato válido)
- `telefono` (string, opcional)
- `documento` (string, obligatorio, único)
- `contrasena` (string, obligatorio, mín 8 caracteres)
- `confirmContrasena` (string, obligatorio, debe coincidir)
- `aceptaTerminos` (boolean, obligatorio = true)

### 1.4 Criterios de Éxito

✓ Usuario creado exitosamente con datos válidos  
✓ Error apropiado cuando campo obligatorio falta  
✓ Error cuando email o documento ya existen  
✓ Validación de formato email  
✓ Validación de contraseña mínimo 8 caracteres  
✓ Usuario creado con rol=CLIENT en BD  

---

## PARTE 2: DISEÑO DE CASOS DE PRUEBA

### 2.1 Matriz de Partición de Equivalencia

| ID | Campo | Clase Equivalencia | Entrada Ejemplo | Salida Esperada | Tipo |
|---|---|---|---|---|---|
| RE-P1 | Nombre | Nombre válido | Juan | Usuario creado | Válida |
| RE-P2 | Nombre | Nombre vacío | "" | Error: campo requerido | Inválida |
| RE-P3 | Nombre | Nombre muy largo (>100) | A×101 | Error o truncado | Borde |
| RE-P4 | Email | Email válido | juan@example.com | Usuario creado | Válida |
| RE-P5 | Email | Email sin @ | juanexample.com | Error: formato inválido | Inválida |
| RE-P6 | Email | Email sin dominio | juan@ | Error: formato inválido | Inválida |
| RE-P7 | Email | Email duplicado | existente@test.com | Error: ya existe | Restricción |
| RE-P8 | Documento | Documento válido | 123456789 | Usuario creado | Válida |
| RE-P9 | Documento | Documento vacío | "" | Error: requerido | Inválida |
| RE-P10 | Documento | Documento duplicado | [Existente en BD] | Error: duplicado | Restricción |
| RE-P11 | Contraseña | Contraseña válida | Pass1234 | Usuario creado | Válida |
| RE-P12 | Contraseña | Contraseña < 8 chars | Pass123 | Error: mín 8 | Inválida |
| RE-P13 | Contraseña | Contraseña vacía | "" | Error: requerida | Inválida |
| RE-P14 | Conf. Contraseña | Coincide con contraseña | [mismo valor] | Usuario creado | Válida |
| RE-P15 | Conf. Contraseña | No coincide | Pass1234 vs Pass123 | Error: no coinciden | Inválida |
| RE-P16 | Términos | Términos aceptados | true | Usuario creado | Válida |
| RE-P17 | Términos | Términos rechazados | false | Error: debe aceptar | Inválida |

### 2.2 Matriz de Valores Límites

| ID | Parámetro | Valor Límite | Entrada | Salida Esperada | Observación |
|---|---|---|---|---|---|
| RE-L1 | Nombre | Mínimo (1 char) | A | Aceptado | Nombre válido |
| RE-L2 | Nombre | Máximo (100 chars) | A×100 | Aceptado | Límite superior |
| RE-L3 | Nombre | Sobre máximo (101 chars) | A×101 | Rechazado/truncado | Validar rechazo |
| RE-L4 | Email | Mínimo válido | a@b.co | Aceptado | 6 caracteres |
| RE-L5 | Email | Máximo (254 chars) | [Email 254 chars] | Aceptado | RFC 5321 |
| RE-L6 | Email | Sobre máximo (255 chars) | [Email 255 chars] | Rechazado | Validar límite |
| RE-L7 | Documento | Mínimo (1 digit) | 1 | Aceptado | Un dígito |
| RE-L8 | Documento | Máximo (20 chars) | 12345678901234567890 | Aceptado | 20 caracteres |
| RE-L9 | Documento | Sobre máximo (21 chars) | 123456789012345678901 | Rechazado | Validar límite |
| RE-L10 | Contraseña | Exactamente 8 chars | Pass1234 | Aceptado | Mínimo exacto |
| RE-L11 | Contraseña | Menos de 8 (7 chars) | Pass123 | Rechazado | Un char menos |
| RE-L12 | Contraseña | Muy larga (100 chars) | P×100 | Aceptado | Sin máximo aparente |
| RE-L13 | Teléfono | Vacío (opcional) | "" | Aceptado | Campo opcional |
| RE-L14 | Teléfono | Mínimo (1 char) | 1 | Aceptado | Un dígito |
| RE-L15 | Teléfono | Formato válido | +57 3001234567 | Aceptado | Con formato |

---

## PARTE 3: ESPECIFICACIÓN DETALLADA DE CASOS

### Plantilla Estándar de Ejecución

```
╔════════════════════════════════════════════════════════════════════════════╗
║ CASO DE PRUEBA: [ID]
╠════════════════════════════════════════════════════════════════════════════╣
║ Título:           [Título descriptivo]
║ Tipo:             [Partición de Equivalencia | Valores Límites]
║ Prioridad:        [Alta | Media | Baja]
╠════════════════════════════════════════════════════════════════════════════╣
║ PRECONDICIONES:
║   □ [Precondición 1]
║   □ [Precondición 2]
║   □ [Precondición 3]
╠════════════════════════════════════════════════════════════════════════════╣
║ ENTRADA:
║   [Parámetro 1]: [Valor]
║   [Parámetro 2]: [Valor]
║   [Parámetro N]: [Valor]
╠════════════════════════════════════════════════════════════════════════════╣
║ PASOS DE EJECUCIÓN:
║   1. [Acción 1]
║   2. [Acción 2]
║   3. [Acción 3]
║   4. [Acción 4]
╠════════════════════════════════════════════════════════════════════════════╣
║ RESULTADO ESPERADO:
║   • [Salida esperada 1]
║   • [Salida esperada 2]
║   • [Salida esperada 3]
╠════════════════════════════════════════════════════════════════════════════╣
║ EJECUCIÓN:
║   Fecha:           ___/___/______
║   Ejecutado por:   ________________________
║   Resultado:       ☐ PASÓ   ☐ FALLÓ   ☐ BLOQUEADO
║
║ NOTAS/EVIDENCIA:
║   _________________________________________________________________
║   _________________________________________________________________
║   _________________________________________________________________
╚════════════════════════════════════════════════════════════════════════════╝
```

---

### CASO RE-P1-A: Registro Exitoso con Datos Válidos

| **Atributo** | **Valor** |
|---|---|
| **ID Caso** | RE-P1-A |
| **Título** | Registro Exitoso con Datos Válidos |
| **Tipo** | Partición de Equivalencia - Válida |
| **Prioridad** | Alta |
| **Precondiciones** | ✓ Base de datos accesible<br>✓ Email y documento no existen previamente<br>✓ API disponible |
| **ENTRADA** | **Nombre:** Juan<br>**Apellido:** Pérez<br>**Email:** juan.perez@example.com<br>**Documento:** 123456789<br>**Teléfono:** 3001234567<br>**Contraseña:** SecurePass123<br>**Confirmación:** SecurePass123<br>**Términos:** true |
| **PASOS** | 1. Llenar todos los campos del formulario<br>2. Hacer clic en "Crear Cuenta"<br>3. Esperar respuesta del servidor<br>4. Verificar usuario creado en BD |
| **RESULTADO ESPERADO** | ✓ Usuario creado exitosamente con ID asignado<br>✓ Nombre: Juan<br>✓ Apellido: Pérez<br>✓ Email: juan.perez@example.com<br>✓ Documento: 123456789<br>✓ Rol: CLIENT<br>✓ Estado: Activo<br>✓ Redirecciona a login |
| **Fecha Ejecución** | ___/___/______ |
| **Ejecutado por** | ________________ |
| **Resultado** | ☐ PASÓ  ☐ FALLÓ  ☐ BLOQUEADO |
| **Notas** | ___________________________________________________________________ |

---

### CASO RE-P2-A: Nombre Vacío (Campo Obligatorio)

| **Atributo** | **Valor** |
|---|---|
| **ID Caso** | RE-P2-A |
| **Título** | Nombre Vacío (Campo Obligatorio) |
| **Tipo** | Partición de Equivalencia - Inválida |
| **Prioridad** | Alta |
| **Precondiciones** | ✓ Formulario de registro cargado<br>✓ Otros campos válidos |
| **ENTRADA** | **Nombre:** "" (vacío)<br>**Apellido:** Pérez<br>**Email:** test@example.com<br>**Documento:** 987654321<br>**Contraseña:** Pass1234<br>**Confirmación:** Pass1234<br>**Términos:** true |
| **PASOS** | 1. Dejar campo nombre vacío<br>2. Llenar resto de campos<br>3. Hacer clic en "Crear Cuenta"<br>4. Capturar mensaje de error |
| **RESULTADO ESPERADO** | ✓ Mensaje de error mostrado:<br>  "El nombre es obligatorio" Ó<br>  "Por favor ingrese su nombre"<br>✓ Usuario NO creado<br>✓ Campo enfocado/destacado en rojo |
| **Fecha Ejecución** | ___/___/______ |
| **Ejecutado por** | ________________ |
| **Resultado** | ☐ PASÓ  ☐ FALLÓ  ☐ BLOQUEADO |
| **Notas** | Mensaje exacto capturado:___________________________________________ |

---

### CASO RE-P4-A: Email Válido (Formato Correcto)

| **Atributo** | **Valor** |
|---|---|
| **ID Caso** | RE-P4-A |
| **Título** | Email Válido (Formato Correcto) |
| **Tipo** | Partición de Equivalencia - Válida |
| **Prioridad** | Alta |
| **Precondiciones** | ✓ Email no existe en BD<br>✓ BD accesible<br>✓ Otros datos válidos |
| **ENTRADA** | **Nombre:** Juan<br>**Apellido:** García<br>**Email:** usuario.valido@dominio.com<br>**Documento:** 555555555<br>**Contraseña:** ValidPass123<br>**Confirmación:** ValidPass123<br>**Términos:** true |
| **PASOS** | 1. Ingresar email con formato correcto<br>2. Llenar resto de campos<br>3. Hacer clic en "Crear Cuenta"<br>4. Validar creación en BD |
| **RESULTADO ESPERADO** | ✓ Usuario creado con email registrado<br>✓ Email: usuario.valido@dominio.com<br>✓ Sin mensajes de error<br>✓ Acceso al siguiente paso |
| **Fecha Ejecución** | ___/___/______ |
| **Ejecutado por** | ________________ |
| **Resultado** | ☐ PASÓ  ☐ FALLÓ  ☐ BLOQUEADO |
| **Notas** | ___________________________________________________________________ |

---

### CASO RE-P5-A: Email Inválido (Sin @)

| **Atributo** | **Valor** |
|---|---|
| **ID Caso** | RE-P5-A |
| **Título** | Email Inválido (Sin @) |
| **Tipo** | Partición de Equivalencia - Inválida |
| **Prioridad** | Alta |
| **Precondiciones** | ✓ Formulario cargado<br>✓ Validación en cliente/servidor activa |
| **ENTRADA** | **Nombre:** Juan<br>**Apellido:** López<br>**Email:** usuariosindominio.com (sin @)<br>**Documento:** 666666666<br>**Contraseña:** Pass1234<br>**Confirmación:** Pass1234<br>**Términos:** true |
| **PASOS** | 1. Ingresar email sin @<br>2. Intentar crear cuenta<br>3. Capturar validación<br>4. Observar comportamiento |
| **RESULTADO ESPERADO** | ✓ Mensaje de error:<br>  "Email no válido" Ó<br>  "Formato de email incorrecto"<br>✓ Campo email marcado en rojo<br>✓ Usuario NO creado<br>✓ Campo enfocado |
| **Fecha Ejecución** | ___/___/______ |
| **Ejecutado por** | ________________ |
| **Resultado** | ☐ PASÓ  ☐ FALLÓ  ☐ BLOQUEADO |
| **Notas** | ___________________________________________________________________ |

---

### CASO RE-P7-A: Email Duplicado (Ya Existe en BD)

| **Atributo** | **Valor** |
|---|---|
| **ID Caso** | RE-P7-A |
| **Título** | Email Duplicado (Ya Existe en BD) |
| **Tipo** | Partición de Equivalencia - Restricción |
| **Prioridad** | Alta |
| **Precondiciones** | ✓ Email "admin@barberia.com" existe en BD<br>✓ BD accesible<br>✓ Validación servidor activa |
| **ENTRADA** | **Nombre:** Pedro<br>**Apellido:** Martínez<br>**Email:** admin@barberia.com (email existente)<br>**Documento:** 777777777<br>**Contraseña:** NewPass123<br>**Confirmación:** NewPass123<br>**Términos:** true |
| **PASOS** | 1. Ingresar email que ya existe<br>2. Completar resto del formulario<br>3. Hacer clic en "Crear Cuenta"<br>4. Esperar validación del servidor |
| **RESULTADO ESPERADO** | ✓ Mensaje de error:<br>  "Este email ya está registrado" Ó<br>  "El email ya existe, intente recuperar su cuenta"<br>✓ Usuario NO creado<br>✓ Sugerencia: "¿Olvidó su contraseña?" |
| **Fecha Ejecución** | ___/___/______ |
| **Ejecutado por** | ________________ |
| **Resultado** | ☐ PASÓ  ☐ FALLÓ  ☐ BLOQUEADO |
| **Notas** | Email usado: admin@barberia.com __________________________________ |

---

### CASO RE-P10-A: Documento Duplicado (Ya Existe)

| **Atributo** | **Valor** |
|---|---|
| **ID Caso** | RE-P10-A |
| **Título** | Documento Duplicado (Ya Existe) |
| **Tipo** | Partición de Equivalencia - Restricción |
| **Prioridad** | Alta |
| **Precondiciones** | ✓ Documento "123456789" existe en BD<br>✓ BD accesible<br>✓ Validación servidor activa |
| **ENTRADA** | **Nombre:** Patricia<br>**Apellido:** Rivera<br>**Email:** patricia.nueva@example.com (diferente)<br>**Documento:** 123456789 (ya existente)<br>**Contraseña:** NewDoc789<br>**Confirmación:** NewDoc789<br>**Términos:** true |
| **PASOS** | 1. Ingresar documento que existe<br>2. Email diferente (para aislar validación doc)<br>3. Crear cuenta<br>4. Capturar error |
| **RESULTADO ESPERADO** | ✓ Mensaje de error:<br>  "Este documento ya está registrado" Ó<br>  "El documento ya existe"<br>✓ Usuario NO creado<br>✓ Sugerencia: "¿Ya tiene cuenta?" |
| **Fecha Ejecución** | ___/___/______ |
| **Ejecutado por** | ________________ |
| **Resultado** | ☐ PASÓ  ☐ FALLÓ  ☐ BLOQUEADO |
| **Notas** | Documento usado: 123456789 _________________________________________ |

---

### CASO RE-P11-A: Contraseña Válida (≥8 caracteres)

| **Atributo** | **Valor** |
|---|---|
| **ID Caso** | RE-P11-A |
| **Título** | Contraseña Válida (≥8 caracteres) |
| **Tipo** | Partición de Equivalencia - Válida |
| **Prioridad** | Alta |
| **Precondiciones** | ✓ Otros datos válidos<br>✓ Campos requeridos llenos |
| **ENTRADA** | **Nombre:** María<br>**Apellido:** García<br>**Email:** maria@example.com<br>**Documento:** 888888888<br>**Contraseña:** MySecurePass123<br>**Confirmación:** MySecurePass123<br>**Términos:** true |
| **PASOS** | 1. Ingresar contraseña de 15 caracteres<br>2. Confirmar contraseña idéntica<br>3. Llenar resto del formulario<br>4. Crear cuenta |
| **RESULTADO ESPERADO** | ✓ Usuario creado exitosamente<br>✓ Contraseña almacenada de forma segura (hash)<br>✓ Sin validaciones de fortaleza requeridas |
| **Fecha Ejecución** | ___/___/______ |
| **Ejecutado por** | ________________ |
| **Resultado** | ☐ PASÓ  ☐ FALLÓ  ☐ BLOQUEADO |
| **Notas** | ___________________________________________________________________ |

---

### CASO RE-P12-A: Contraseña Muy Corta (<8 caracteres)

| **Atributo** | **Valor** |
|---|---|
| **ID Caso** | RE-P12-A |
| **Título** | Contraseña Muy Corta (<8 caracteres) |
| **Tipo** | Partición de Equivalencia - Inválida |
| **Prioridad** | Alta |
| **Precondiciones** | ✓ Formulario cargado<br>✓ Validación activa |
| **ENTRADA** | **Nombre:** Carlos<br>**Apellido:** Ruiz<br>**Email:** carlos@example.com<br>**Documento:** 999999999<br>**Contraseña:** Pass12 (7 caracteres)<br>**Confirmación:** Pass12<br>**Términos:** true |
| **PASOS** | 1. Ingresar contraseña de 7 caracteres<br>2. Intentar crear cuenta<br>3. Capturar validación<br>4. Observar enfoque |
| **RESULTADO ESPERADO** | ✓ Mensaje de error:<br>  "La contraseña debe tener al menos 8 caracteres"<br>✓ Campo contraseña marcado<br>✓ Usuario NO creado<br>✓ Enfoque en campo contraseña |
| **Fecha Ejecución** | ___/___/______ |
| **Ejecutado por** | ________________ |
| **Resultado** | ☐ PASÓ  ☐ FALLÓ  ☐ BLOQUEADO |
| **Notas** | ___________________________________________________________________ |

---

### CASO RE-P15-A: Contraseñas No Coinciden

| **Atributo** | **Valor** |
|---|---|
| **ID Caso** | RE-P15-A |
| **Título** | Contraseñas No Coinciden |
| **Tipo** | Partición de Equivalencia - Inválida |
| **Prioridad** | Alta |
| **Precondiciones** | ✓ Formulario cargado<br>✓ Validación de coincidencia activa |
| **ENTRADA** | **Nombre:** Ana<br>**Apellido:** Sánchez<br>**Email:** ana@example.com<br>**Documento:** 444444444<br>**Contraseña:** SecurePass123<br>**Confirmación:** SecurePass124 (diferente)<br>**Términos:** true |
| **PASOS** | 1. Ingresar contraseña<br>2. Ingresar confirmación diferente<br>3. Intentar crear cuenta<br>4. Capturar error |
| **RESULTADO ESPERADO** | ✓ Mensaje de error:<br>  "Las contraseñas no coinciden" Ó<br>  "Confirmación de contraseña incorrecta"<br>✓ Ambos campos marcados<br>✓ Usuario NO creado |
| **Fecha Ejecución** | ___/___/______ |
| **Ejecutado por** | ________________ |
| **Resultado** | ☐ PASÓ  ☐ FALLÓ  ☐ BLOQUEADO |
| **Notas** | ___________________________________________________________________ |

---

### CASO RE-P17-A: Términos Rechazados (false)

| **Atributo** | **Valor** |
|---|---|
| **ID Caso** | RE-P17-A |
| **Título** | Términos Rechazados (false) |
| **Tipo** | Partición de Equivalencia - Inválida |
| **Prioridad** | Alta |
| **Precondiciones** | ✓ Formulario cargado<br>✓ Checkbox no marcado |
| **ENTRADA** | **Nombre:** Fernando<br>**Apellido:** López<br>**Email:** fernando@example.com<br>**Documento:** 666222111<br>**Contraseña:** NoTerms1234<br>**Confirmación:** NoTerms1234<br>**Términos:** false (checkbox sin marcar) |
| **PASOS** | 1. Dejar checkbox sin marcar<br>2. Llenar todos los campos<br>3. Intentar crear cuenta<br>4. Capturar validación |
| **RESULTADO ESPERADO** | ✓ Mensaje de error:<br>  "Debe aceptar los términos y condiciones" Ó<br>  "Por favor acepte los términos"<br>✓ Checkbox enfocado/destacado<br>✓ Usuario NO creado |
| **Fecha Ejecución** | ___/___/______ |
| **Ejecutado por** | ________________ |
| **Resultado** | ☐ PASÓ  ☐ FALLÓ  ☐ BLOQUEADO |
| **Notas** | ___________________________________________________________________ |

---

### CASO RE-L10-A: Contraseña Exactamente 8 Caracteres (Mínimo Exacto)

| **Atributo** | **Valor** |
|---|---|
| **ID Caso** | RE-L10-A |
| **Título** | Contraseña Exactamente 8 Caracteres (Mínimo Exacto) |
| **Tipo** | Valores Límites - Mínimo |
| **Prioridad** | Alta |
| **Precondiciones** | ✓ Formulario cargado<br>✓ Validación configurada para mínimo 8 |
| **ENTRADA** | **Nombre:** Lucas<br>**Apellido:** Martín<br>**Email:** lucas@example.com<br>**Documento:** 333333333<br>**Contraseña:** Pass1234 (exactamente 8 caracteres)<br>**Confirmación:** Pass1234<br>**Términos:** true |
| **PASOS** | 1. Ingresar contraseña con exactamente 8 caracteres<br>2. Confirmar igual<br>3. Crear cuenta<br>4. Verificar aceptación |
| **RESULTADO ESPERADO** | ✓ Usuario creado exitosamente<br>✓ Contraseña aceptada sin error<br>✓ Validación pasa el límite mínimo<br>✓ Rol: CLIENT asignado |
| **Fecha Ejecución** | ___/___/______ |
| **Ejecutado por** | ________________ |
| **Resultado** | ☐ PASÓ  ☐ FALLÓ  ☐ BLOQUEADO |
| **Notas** | Longitud exacta de contraseña: 8 caracteres _________________________ |

---

### CASO RE-L11-A: Contraseña 7 Caracteres (Bajo Mínimo)

| **Atributo** | **Valor** |
|---|---|
| **ID Caso** | RE-L11-A |
| **Título** | Contraseña 7 Caracteres (Bajo Mínimo) |
| **Tipo** | Valores Límites - Debajo de Mínimo |
| **Prioridad** | Alta |
| **Precondiciones** | ✓ Formulario cargado<br>✓ Validación activa |
| **ENTRADA** | **Nombre:** David<br>**Apellido:** López<br>**Email:** david@example.com<br>**Documento:** 444444444<br>**Contraseña:** Pass123 (7 caracteres)<br>**Confirmación:** Pass123<br>**Términos:** true |
| **PASOS** | 1. Ingresar contraseña de 7 caracteres<br>2. Intentar crear cuenta<br>3. Capturar error exacto<br>4. Validar rechazo |
| **RESULTADO ESPERADO** | ✓ Error mostrado:<br>  "Contraseña muy corta (mínimo 8 caracteres)"<br>✓ Usuario NO creado<br>✓ Campo enfocado<br>✓ Límite validado correctamente |
| **Fecha Ejecución** | ___/___/______ |
| **Ejecutado por** | ________________ |
| **Resultado** | ☐ PASÓ  ☐ FALLÓ  ☐ BLOQUEADO |
| **Notas** | Validación: Diferencia de 1 carácter causa rechazo __________________ |

---

### CASO RE-L1-A: Nombre Mínimo (1 carácter)

| **Atributo** | **Valor** |
|---|---|
| **ID Caso** | RE-L1-A |
| **Título** | Nombre Mínimo (1 carácter) |
| **Tipo** | Valores Límites - Mínimo |
| **Prioridad** | Media |
| **Precondiciones** | ✓ Formulario cargado<br>✓ BD accesible<br>✓ Otros datos válidos |
| **ENTRADA** | **Nombre:** A (un solo carácter)<br>**Apellido:** Pérez<br>**Email:** one@example.com<br>**Documento:** 111111111<br>**Contraseña:** OneChar8<br>**Confirmación:** OneChar8<br>**Términos:** true |
| **PASOS** | 1. Ingresar nombre de 1 carácter<br>2. Completar formulario<br>3. Crear cuenta<br>4. Validar creación |
| **RESULTADO ESPERADO** | ☐ Usuario creado con nombre "A"  Ó<br>☐ Error "Nombre muy corto"<br>Marcar cual ocurre en ejecución |
| **Fecha Ejecución** | ___/___/______ |
| **Ejecutado por** | ________________ |
| **Resultado** | ☐ PASÓ  ☐ FALLÓ  ☐ BLOQUEADO |
| **Notas** | Comportamiento observado: __________________________________________ |

---

### CASO RE-L2-A: Nombre Máximo (100 caracteres)

| **Atributo** | **Valor** |
|---|---|
| **ID Caso** | RE-L2-A |
| **Título** | Nombre Máximo (100 caracteres) |
| **Tipo** | Valores Límites - Máximo |
| **Prioridad** | Media |
| **Precondiciones** | ✓ Formulario cargado<br>✓ Otros datos válidos |
| **ENTRADA** | **Nombre:** [A×100] (100 caracteres exactos)<br>**Apellido:** García<br>**Email:** max100@example.com<br>**Documento:** 222222222<br>**Contraseña:** Max100Char<br>**Confirmación:** Max100Char<br>**Términos:** true |
| **PASOS** | 1. Ingresar nombre exactamente 100 caracteres<br>2. Completar formulario<br>3. Crear cuenta<br>4. Verificar persistencia en BD |
| **RESULTADO ESPERADO** | ✓ Usuario creado con nombre de 100 caracteres<br>✓ BD contiene los 100 caracteres<br>✓ Sin truncamiento<br>✓ Rol CLIENT asignado |
| **Fecha Ejecución** | ___/___/______ |
| **Ejecutado por** | ________________ |
| **Resultado** | ☐ PASÓ  ☐ FALLÓ  ☐ BLOQUEADO |
| **Notas** | Longitud verificada: 100 caracteres ________________________________ |

---

### CASO RE-L4-A: Email Mínimo Válido (a@b.co)

| **Atributo** | **Valor** |
|---|---|
| **ID Caso** | RE-L4-A |
| **Título** | Email Mínimo Válido (a@b.co) |
| **Tipo** | Valores Límites - Mínimo Email |
| **Prioridad** | Media |
| **Precondiciones** | ✓ Formulario cargado<br>✓ Otros datos válidos |
| **ENTRADA** | **Nombre:** Eduardo<br>**Apellido:** Sánchez<br>**Email:** a@b.co (6 caracteres mínimo RFC 5321)<br>**Documento:** 555666777<br>**Contraseña:** MinEmail8<br>**Confirmación:** MinEmail8<br>**Términos:** true |
| **PASOS** | 1. Ingresar email de 6 caracteres (mínimo válido)<br>2. Completar formulario<br>3. Crear cuenta<br>4. Verificar aceptación |
| **RESULTADO ESPERADO** | ✓ Usuario creado con email válido<br>✓ Email: a@b.co registrado<br>✓ Sin validaciones adicionales<br>✓ BD actualizada |
| **Fecha Ejecución** | ___/___/______ |
| **Ejecutado por** | ________________ |
| **Resultado** | ☐ PASÓ  ☐ FALLÓ  ☐ BLOQUEADO |
| **Notas** | Email verificado: a@b.co (6 caracteres) _____________________________ |

---

## RESUMEN EJECUTABLE

### Checklist de Ejecución

#### Casos de Partición de Equivalencia (12)
- [ ] RE-P1-A: Registro exitoso datos válidos
- [ ] RE-P2-A: Nombre vacío
- [ ] RE-P4-A: Email válido
- [ ] RE-P5-A: Email inválido (sin @)
- [ ] RE-P7-A: Email duplicado
- [ ] RE-P10-A: Documento duplicado
- [ ] RE-P11-A: Contraseña válida (≥8)
- [ ] RE-P12-A: Contraseña < 8 caracteres
- [ ] RE-P15-A: Contraseñas no coinciden
- [ ] RE-P17-A: Términos rechazados
- [ ] RE-P3-A: Nombre > 100 caracteres
- [ ] RE-P16-A: Términos aceptados

#### Casos de Valores Límites (5)
- [ ] RE-L10-A: Contraseña exactamente 8 caracteres
- [ ] RE-L11-A: Contraseña 7 caracteres
- [ ] RE-L1-A: Nombre = 1 carácter
- [ ] RE-L2-A: Nombre = 100 caracteres
- [ ] RE-L4-A: Email mínimo válido (a@b.co)

### Contadores

| Tipo | Cantidad | % |
|---|---|---|
| Partición Equivalencia | 12 | 70.6% |
| Valores Límites | 5 | 29.4% |
| **TOTAL** | **17** | **100%** |

### Cierre de Ejecución

| Elemento | Valor |
|---|---|
| Fecha Inicio | ___/___/______ |
| Fecha Cierre | ___/___/______ |
| Ejecutado por | _________________________ |
| Casos Pasados | ___ de 17 ( __% ) |
| Casos Fallidos | ___ de 17 ( __% ) |
| Casos Bloqueados | ___ de 17 ( __% ) |
| Aprobado por | _________________________ |

### Observaciones Finales

Espacio para documentar:
- Comportamientos inesperados
- Mensajes de error exactos (copiar/pegar)
- Datos persistidos en BD
- Tiempos de respuesta
- Problemas de usabilidad
- Recomendaciones de mejora

```
________________________________________________________________
________________________________________________________________
________________________________________________________________
________________________________________________________________
```

---

**Documento completado:** 2026-05-20  
**Versión:** 1.0  
**Estado:** Listo para Ejecución
