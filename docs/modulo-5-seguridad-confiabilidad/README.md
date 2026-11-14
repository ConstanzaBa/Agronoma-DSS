# Módulo 5 - Seguridad y Confiabilidad

## Introducción

Agrónoma es un sistema distribuido que procesa información de usuarios, establecimientos, sensores, silos, cotizaciones y alertas.

Al existir varios servicios comunicándose mediante la red, la seguridad no depende únicamente del inicio de sesión. También es necesario proteger la comunicación entre componentes, controlar el acceso a los recursos, limitar solicitudes, validar mensajes y definir cómo debe comportarse el sistema cuando falla alguna dependencia.

La estrategia de Agrónoma contempla:

- confidencialidad de la información;
- integridad de datos y mensajes;
- disponibilidad controlada;
- autenticación centralizada;
- autorización por rol y propietario;
- protección del acceso interno;
- prevención de abuso;
- detección de fallos;
- degradación controlada;
- idempotencia;
- consistencia eventual.

## Principios de seguridad

### Confidencialidad

La confidencialidad busca impedir que la información pueda ser leída por componentes o usuarios no autorizados.

En producción, la comunicación pública se realiza mediante HTTPS.

Las contraseñas no se almacenan en texto plano. El servicio `auth` utiliza mecanismos de hash para conservarlas de forma segura.

Los tokens de acceso tampoco se guardan directamente. El token presentado por el cliente se transforma mediante SHA-256 antes de buscarlo en la base de datos.

Las credenciales de las bases de datos, secretos internos y claves de proveedores externos se almacenan mediante variables de entorno y no deben incluirse en el repositorio.

### Integridad

La integridad protege la información frente a modificaciones no autorizadas o inconsistentes.

Agrónoma aplica diferentes mecanismos:

- validación de datos recibidos;
- restricciones e índices en las bases de datos;
- claves de idempotencia;
- identificadores únicos de eventos;
- secuencias por dispositivo;
- transacciones;
- bloqueo de registros mediante `lockForUpdate()`;
- firma HMAC para el webhook de mercado.

Estos mecanismos permiten verificar que las operaciones recibidas son válidas y evitar que reintentos o ejecuciones simultáneas provoquen resultados incorrectos.

### Disponibilidad

La disponibilidad busca mantener accesibles las funciones del sistema o, cuando eso no sea posible, producir una respuesta controlada.

Agrónoma aplica:

- health checks;
- timeouts;
- reintentos limitados exclusivamente a operaciones seguras;
- rate limiting;
- circuit breakers;
- respuestas `503` cuando una dependencia no está disponible;
- utilización de información almacenada cuando un proveedor externo falla;
- procesamiento desacoplado de alertas.

La arquitectura no garantiza alta disponibilidad completa, ya que no implementa réplicas de bases de datos ni múltiples instancias de todos los servicios. Esta limitación se declara explícitamente.

## Amenazas principales

### Interceptación

Un atacante podría intentar capturar credenciales, tokens o información transmitida entre el frontend y el backend.

Las principales defensas son:

- HTTPS en producción;
- almacenamiento seguro de contraseñas;
- almacenamiento del hash de los tokens;
- secretos y credenciales fuera del código;
- acceso a los servicios internos a través del Gateway.

### Suplantación

Un cliente podría intentar enviar identificadores o roles falsos para acceder a información ajena.

El API Gateway descarta las cabeceras internas que pueda enviar el cliente y genera nuevamente la identidad después de validar el token.

Entre las cabeceras internas se encuentran:

- `X-Usuario-Id`;
- `X-Usuario-Rol`;
- `X-Autenticable-Tipo`;
- `X-Autenticable-Id`;
- `X-Request-Id`.

Los servicios internos verifican además un secreto compartido mediante `X-Gateway-Secret`.

De esta forma, un cliente no puede obtener permisos adicionales simplemente enviando cabeceras de identidad propias.

### Denegación de servicio

Un usuario o proceso automatizado podría realizar una cantidad excesiva de solicitudes.

El Gateway aplica rate limiting diferenciado según el tipo de operación.

Las rutas públicas de autenticación utilizan un límite más restrictivo para dificultar intentos repetidos de acceso, mientras que las operaciones autenticadas tienen un límite configurable por usuario o dispositivo.

Cuando se supera el límite, el sistema devuelve HTTP `429` e informa el tiempo de espera cuando corresponde.

## Autenticación

La autenticación se encuentra centralizada en el servicio `auth`.

Este servicio gestiona:

- usuarios;
- roles;
- tokens de acceso;
- validez y vencimiento de tokens;
- activación o desactivación de cuentas;
- identidad de dispositivos cuando corresponde.

El frontend envía el token mediante:

`Authorization: Bearer TOKEN`

El API Gateway valida la identidad antes de reenviar la solicitud hacia los servicios internos.

Las rutas de registro e inicio de sesión son públicas. Las operaciones protegidas requieren un token válido.

## Autorización

Autenticar determina quién realiza una solicitud. Autorizar determina qué operaciones puede realizar.

Agrónoma aplica autorización mediante:

- roles;
- restricciones de rutas;
- permisos asociados al tipo de identidad;
- filtrado de recursos por `usuario_id`;
- ocultación de recursos pertenecientes a otros usuarios.

Un usuario que intenta acceder a un recurso ajeno recibe una respuesta equivalente a recurso inexistente. Esto evita revelar que el recurso existe y pertenece a otra persona.

Los tokens utilizados por sensores se limitan a las operaciones necesarias para enviar lecturas y no otorgan acceso general al resto del sistema.

## Protección de servicios internos

Los servicios de dominio no deben exponerse como si fueran APIs públicas independientes.

Las solicitudes internas requieren `X-Gateway-Secret`.

Si el secreto no está presente o no coincide con el configurado, el servicio devuelve:

- estado HTTP `403`;
- código `acceso_directo`.

El secreto utilizado en producción debe almacenarse mediante variables de entorno y no debe publicarse en el repositorio ni en la documentación.

Las rutas internas tampoco son reenviadas públicamente por el Gateway.

## Seguridad del webhook

El webhook del servicio `mercado` se protege mediante una firma HMAC.

La firma permite comprobar que el contenido recibido fue generado por una fuente que conoce el secreto compartido y que el mensaje no fue modificado durante el envío.

El webhook no se expone mediante las rutas convencionales del Gateway. El proveedor se comunica directamente con el endpoint específico de `mercado`.

## Validación y formato de errores

Los servicios validan el contenido de las solicitudes antes de procesarlo.

Los errores utilizan una estructura común con campos como:

- `codigo`;
- `mensaje`;
- `detalles`.

La estandarización permite que el frontend interprete de forma uniforme errores de autenticación, autorización, validación, inexistencia de recursos y fallos de servicios.

En producción, las respuestas no deben revelar trazas internas, contraseñas, secretos, consultas SQL ni detalles sensibles de configuración.

## Idempotencia

Las redes y colas pueden provocar reintentos. Por ello, el sistema no debe asumir que cada solicitud o evento será recibido una sola vez.

Agrónoma utiliza:

- `clave_idempotencia` en operaciones críticas;
- `event_id` para reconocer eventos ya procesados;
- índice único compuesto por `dispositivo_id` y `secuencia` para las lecturas;
- control por contenido en aquellos recursos donde no existe una clave específica.

La idempotencia evita duplicar movimientos, lecturas, alertas y otros efectos cuando una operación es reenviada.

## Health checks y detección de fallos

Los servicios exponen rutas de salud que permiten comprobar su estado.

Se diferencian dos conceptos:

### Liveness

Indica si el proceso del servicio está activo.

### Readiness

Indica si el servicio se encuentra preparado para atender operaciones y utilizar las dependencias necesarias.

Un servicio puede estar activo pero no listo, por ejemplo, si no puede conectarse a su base de datos.

Para que los health checks permitan detectar fallos, deben ser consultados periódicamente por un servicio externo de monitorización.

## Timeouts y reintentos

Las comunicaciones distribuidas no deben esperar indefinidamente.

El Gateway utiliza tiempos máximos de espera al comunicarse con los servicios.

Los reintentos se limitan a operaciones `GET`, porque normalmente son operaciones de lectura. Las operaciones `POST` no se reintentan automáticamente porque podrían producir efectos duplicados si el receptor procesó la solicitud aunque la respuesta no haya llegado correctamente.

Las operaciones de escritura se protegen mediante idempotencia cuando corresponde.

## Circuit breaker

El Gateway protege la comunicación con cada servicio mediante un circuit breaker.

El circuito puede encontrarse en tres estados:

- cerrado;
- abierto;
- semiabierto.

Mientras está cerrado, las solicitudes se procesan normalmente.

Después de varios fallos consecutivos, el circuito se abre y las solicitudes hacia el servicio afectado fallan rápidamente, evitando acumular esperas y propagar el problema.

Después del tiempo configurado, se permite una solicitud de prueba. Si funciona, el circuito vuelve a cerrarse. Si falla, permanece abierto.

## Consistencia eventual

Algunas operaciones del sistema no reflejan un cambio en todos los componentes de manera instantánea.

Agrónoma presenta consistencia eventual en casos como:

- validación de tokens almacenada temporalmente en caché;
- eventos procesados posteriormente por `alertas`;
- correos enviados mediante trabajos asíncronos;
- actualización y reutilización temporal de datos externos.

La consistencia eventual se utiliza únicamente cuando la operación no necesita que todos los componentes confirmen el cambio dentro de la misma solicitud.

## Gestión de alertas

El servicio `alertas` procesa los eventos y evita generar duplicados innecesarios.

Los eventos ya procesados se registran mediante su `event_id`.

También se controla la existencia de alertas activas del mismo tipo y entidad. Si un nuevo evento representa una gravedad mayor, la alerta existente puede aumentar su severidad en lugar de generar otra alerta equivalente.

Los correos se procesan fuera del camino principal de la solicitud para evitar que una demora del proveedor de correo detenga la operación que originó la alerta.

## Degradación controlada

Cuando una dependencia externa falla, el sistema intenta conservar la funcionalidad que todavía puede ofrecer.

### Fallo del proveedor meteorológico

Si Open-Meteo no responde y existe información previamente almacenada, `campo` devuelve el último registro disponible marcado como desactualizado.

### Fallo de un servicio interno

El Gateway devuelve un error controlado con estado `503` cuando el servicio necesario no está disponible.

### Fallo de silos durante un cálculo comercial

Si `mercado` no puede obtener la información necesaria desde `silos`, el índice que depende de esa información no debe calcularse utilizando datos inventados.

### Fallo del procesamiento de alertas

La operación que genera el evento mantiene separada su responsabilidad principal del procesamiento posterior de la alerta.

Cuando corresponde, los trabajos fallidos pueden registrarse para facilitar su diagnóstico y posterior revisión.

## Replicación

La implementación actual no utiliza replicación activa ni pasiva de las bases de datos.

Cada servicio mantiene una única base MySQL.

### Replicación activa

Varias réplicas podrían procesar solicitudes y mantener copias coordinadas del estado.

### Replicación pasiva

Una instancia primaria procesaría las operaciones y transferiría el estado hacia una réplica de respaldo.

Ninguna de estas estrategias forma parte de la infraestructura actual. Por lo tanto, el sistema no debe presentarse como una solución de alta disponibilidad.

La replicación queda planteada como una posible evolución si el proyecto necesitara tolerar la caída completa de una base de datos o servidor.

## Trazabilidad

El Gateway genera un `X-Request-Id` para cada petición.

Este identificador se propaga durante el procesamiento y se incorpora a los registros del sistema.

La trazabilidad permite relacionar una solicitud externa con las operaciones realizadas por los servicios y facilita el diagnóstico de fallos distribuidos.

Los logs deben registrar información suficiente para investigar un problema, pero no deben contener contraseñas, tokens completos ni secretos.

## Plan de contingencia

Ante una incidencia se debe identificar primero qué componente está fallando.

El procedimiento general contempla:

1. consultar los health checks;
2. identificar el servicio afectado;
3. revisar los logs mediante `X-Request-Id`;
4. comprobar la conexión con la base de datos;
5. verificar variables de entorno y dependencias externas;
6. comprobar el estado de colas o trabajos fallidos;
7. mantener disponibles las funciones que no dependan del componente afectado;
8. restaurar el servicio sin inventar ni modificar manualmente datos del dominio.

## Limitaciones de confiabilidad

La implementación actual presenta limitaciones conocidas:

- un único API Gateway;
- una base MySQL por servicio sin réplicas;
- ausencia de despliegue automático de múltiples instancias;
- dependencia del hosting compartido;
- dependencia de proveedores externos;
- ausencia de consenso distribuido;
- procesamiento de colas adaptado a las restricciones del entorno.

Estas limitaciones no impiden clasificar Agrónoma como sistema distribuido, pero sí impiden afirmar que posee alta disponibilidad total.
