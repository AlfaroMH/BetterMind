# MANUAL DE USUARIO - PLATAFORMA BETTERMIND

## 1. Glosario Técnico
- **API (Application Programming Interface)**: Interfaz que permite la comunicación entre el aplicativo y servicios externos (como la IA o la base de datos).
- **Frontend**: La parte visual y estética del aplicativo con la que interactúa el usuario directamente.
- **Backend (Edge Functions)**: Lógica que se ejecuta en la nube para procesar tareas complejas como el diagnóstico por IA.
- **Token / JWT**: Llave de seguridad digital que identifica al usuario y permite el acceso seguro a sus datos.
- **Rol**: Nivel de permiso asignado (Padre o Estudiante) que define qué secciones puede ver cada usuario.
- **Supabase**: Servicio de base de datos en la nube donde se almacena el progreso de los niños.
- **Groq / Llama 3**: Tecnología de Inteligencia Artificial que analiza el desempeño pedagógico.

---

## 2. Introducción y Requisitos del Sistema
### Objetivo del manual
Este documento tiene como fin guiar al usuario (padre o tutor) en el uso correcto de BetterMind, desde el registro inicial hasta la interpretación del diagnóstico pedagógico generado por IA.

### Descripción de la plataforma
BetterMind es una solución tecnológica educativa diseñada para fortalecer procesos cognitivos y habilidades matemáticas en niños de grados 5° a 9°. El sistema utiliza gamificación para motivar al estudiante y un Agente de IA real para proporcionar a los padres un análisis detallado del progreso, permitiendo una intervención pedagógica personalizada.

### Requisitos del Sistema
- **Hardware Mínimo**:
  - Memoria RAM: 4GB.
  - Resolución de pantalla: 1024x768 (Optimizado para Tablets y Desktop).
  - Procesador: Dual-core 2.0 GHz o superior.
- **Software (Entorno Cliente)**:
  - Navegadores compatibles: Google Chrome (v90+), Mozilla Firefox (v88+), Microsoft Edge.
  - Conexión a internet estable para la sincronización de puntajes y diagnósticos.

---

## 3. Guía de Inicio Rápido
### URL de Acceso
El sistema es accesible vía: `https://bettermind-official.vercel.app`.

### Instrucciones de Registro y Login
1. **Registro**: Haga clic en "¿No tienes cuenta? Regístrate", complete sus datos personales (Nombre, Email, Contraseña) y acepte los términos de privacidad.
2. **Login**: Ingrese su email y contraseña. El sistema mantendrá su sesión activa de forma segura.


---

## 4. Descripción de Módulos y Roles
### Matriz de Roles y Permisos
| Acción | Rol: Padre | Rol: Estudiante |
| :--- | :---: | :---: |
| Jugar Minijuegos | Sí | Sí |
| Ver Puntajes Propios | Sí | Sí |
| Gestionar Perfiles de Hijos | Sí | No |
| Consultar Diagnóstico IA | Sí | No |
| Eliminar Datos de Progreso | Sí | No |

### Módulos del Sistema
- **Módulo de Juegos**: Catálogo de retos matemáticos divididos por grados.
- **Panel de Padres**: Centro de control para supervisar el avance de uno o más hijos.
- **Agente Pedagógico (IA)**: Cerebro del sistema que genera planes de mejora dinámicos.

---

## 5. Guía de Operación Paso a Paso

### Procedimiento A: Creación de Perfil de Estudiante
- **Precondición**: El usuario debe haber iniciado sesión como Padre.
- **Pasos**:
  1. Diríjase al "Panel de Padres".
  2. Haga clic en el botón azul "+" (Añadir Hijo).
  3. Ingrese el nombre, fecha de nacimiento y asigne un PIN de seguridad de 4 dígitos.
  4. Seleccione el grado escolar (5° a 9°).
  5. Presione "Guardar".
- **Postcondición**: El perfil aparecerá en la lista para perfiles, al acceder a este pedirá doble verificación, la primera es el pin de acceso y la segunda la autorización por parte del padre, completada satisfactoriamente estos dos requisitos, se redirigirá hasta el menú principal listo para jugar.

### Procedimiento B: Consulta de Diagnóstico IA
- **Precondición**: El niño debe haber completado al menos 1 nivel de juego.
- **Pasos**:
  1. En el Panel de Padres, localice al niño y presione "Seguimiento".
  2. Haga clic en el botón "🧠 Consultar Diagnóstico IA".
  3. Espere unos segundos a que el Agente analice los datos de Groq.
  4. Revise el Plan de Mejora y las Observaciones de Seguimiento (Rojo/Naranja/Verde).
- **Postcondición**: El sistema mostrará un análisis pedagógico profesional.

---

## 6. Gestión de Errores y FAQ (Preguntas Frecuentes)
- **Error: "Formato de correo inválido"**: Verifique que su email incluya el símbolo @ y un dominio válido (.com, .es).
- **Error: "La IA está experimentando mucha carga"**: Este mensaje aparece si la API gratuita de Groq alcanzó su límite de velocidad. Espere 1 minuto e intente de nuevo.


---

## 7. Aspectos de Accesibilidad y Seguridad
### Buenas Prácticas y Ley de Datos
- **Seguridad**: No comparta el PIN de acceso del panel de padres con los niños. Utilice contraseñas robustas (mayúsculas, números y símbolos).
- **Habeas Data (Ley 1581 de 2012)**: BetterMind cumple con la normativa colombiana. Los datos del menor (nombre y progreso) son privados y solo el padre titular puede eliminarlos o consultarlos mediante el panel de control.

### Accesibilidad
- **Visual**: La plataforma utiliza fuentes normalizadas y alto contraste para facilitar la lectura.
- **Auditivo**: El sistema incluye retroalimentación sonora para aciertos y errores, facilitando el aprendizaje kinestésico.
