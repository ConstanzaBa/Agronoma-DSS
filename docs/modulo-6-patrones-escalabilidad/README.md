# Módulo 6 - Patrones y Escalabilidad

## Introducción

Agrónoma aplica diferentes patrones de diseño distribuido para separar responsabilidades, reducir el acoplamiento entre componentes y controlar la propagación de fallos.

Los principales patrones utilizados son:

- Proxy.
- API Gateway.
- Fachada.
- Adaptador.
- Circuit Breaker.
- Observador distribuido.
- Mensaje-comando.

Además, el diseño contempla estrategias de escalabilidad y posibles evoluciones para los componentes que pueden experimentar un mayor crecimiento de datos o carga.

## API Gateway

El servicio `api` constituye el único punto de entrada utilizado por el frontend.

El Gateway centraliza responsabilidades transversales como:

- autenticación;
- autorización inicial;
- CORS;
- rate limiting;
- enrutamiento;
- resolución del contexto del usuario (cuenta, rol y establecimiento);
- propagación de identidad y contexto;
- identificación de solicitudes;
- control de fallos mediante circuit breaker.

El frontend utiliza una única URL base y no necesita conocer las direcciones individuales de los distintos servicios.

## Patrón Proxy

El Gateway actúa como Proxy cuando recibe una solicitud y la reenvía al servicio correspondiente manteniendo el contrato de la operación.

El flujo general es:

Frontend → API Gateway → Servicio

El Proxy permite interponer controles antes de alcanzar el destino final.

Por ejemplo, antes de reenviar una operación protegida, el Gateway valida el token, resuelve el contexto del usuario y construye las cabeceras internas de identidad y contexto. Además, impide la exposición pública de las rutas `/interno/*`.

Esta estrategia mantiene los servicios internos fuera del acceso directo utilizado normalmente por el frontend.

## Patrón Fachada

Agrónoma utiliza el patrón Fachada mediante:

`GET /v1/resumen`

El objetivo es proporcionar al frontend una operación de mayor nivel que represente información procedente de distintos dominios del sistema.

En lugar de obligar al cliente a conocer y coordinar múltiples servicios, la fachada concentra esa coordinación detrás de una única operación.

El patrón simplifica el contrato utilizado por el frontend y mantiene la distribución interna del backend fuera de la lógica de presentación.

## Patrón Adaptador

Agrónoma necesita integrar proveedores externos con contratos que no forman parte del dominio interno.

Para impedir que la lógica de negocio dependa directamente del formato específico de cada proveedor, se utiliza el patrón Adaptador.

Este patrón aparece principalmente en las integraciones de clima y mercado.

### Clima

El servicio `campo` encapsula la integración con Open-Meteo.

El resto de la lógica de campo consume una representación propia y no necesita conocer los detalles particulares del proveedor.

### Mercado

El servicio `mercado` encapsula los proveedores externos utilizados para obtener información económica.

Actualmente se integran:

- granos.ar para precios de granos;
- DolarAPI para tipo de cambio.

El objetivo del adaptador es permitir sustituir o modificar una integración externa sin trasladar ese cambio a toda la lógica del dominio.

## Circuit Breaker

El API Gateway implementa un Circuit Breaker por servicio.

Su objetivo es impedir que el sistema continúe realizando solicitudes contra un servicio que está fallando repetidamente.

El circuito contempla tres estados:

### Cerrado

Las solicitudes se procesan normalmente.

Los fallos consecutivos se contabilizan.

### Abierto

Al alcanzarse el umbral configurado, el circuito se abre.

Mientras permanece abierto, las nuevas solicitudes fallan rápidamente sin esperar nuevamente al servicio afectado.

### Semiabierto

Después del período configurado se permite una solicitud de prueba.

Si la operación funciona, el circuito vuelve al estado cerrado.

Si vuelve a fallar, regresa al estado abierto.

Este patrón reduce la propagación de fallos y evita acumular tiempos de espera innecesarios cuando un servicio se encuentra temporalmente fuera de disponibilidad.

## Observador distribuido

La comunicación mediante eventos permite aplicar una variante distribuida del patrón Observador.

Los servicios productores publican hechos ocurridos sin necesitar conocer directamente a los consumidores.

Conceptualmente:

Productor → evento → consumidor

El servicio `alertas` consume los eventos que necesita para evaluar reglas y generar alertas.

El productor no necesita contener la lógica del consumidor ni realizar una llamada específica para cada reacción posible.

Esta separación disminuye el acoplamiento y permite incorporar nuevos consumidores sin modificar necesariamente al productor del evento.

## Mensaje-comando

Agrónoma también utiliza el concepto de mensaje-comando para representar operaciones que deben ser ejecutadas por un destinatario específico.

El envío de correo asociado a una alerta se modela mediante `EnviarCorreoAlerta`.

A diferencia de un evento, que informa que ocurrió un hecho y puede interesar a diferentes consumidores, un comando expresa una acción concreta que debe ejecutarse.

La separación permite mantener el envío del correo fuera del camino principal de la solicitud que originó la alerta.

## Diferencia entre evento y comando

Un evento describe algo que ya ocurrió.

Ejemplos:

- una lectura fue recibida;
- cambió la temperatura de un silo;
- se actualizó una cotización.

Un comando solicita ejecutar una acción.

Por ejemplo:

`EnviarCorreoAlerta`

Esta diferencia permite diseñar los mensajes según la intención real de la comunicación.

## Desacoplamiento

Los patrones utilizados buscan impedir que un componente necesite conocer detalles internos de otro.

El frontend conoce el Gateway, no las implementaciones internas de cada servicio.

Los servicios productores de eventos conocen el contrato del evento, pero no la implementación de `alertas`.

La lógica de negocio conoce la interfaz de las integraciones externas, pero no debería depender directamente de los detalles particulares de cada proveedor.

Esta separación permite modificar componentes manteniendo estables sus contratos externos.

## Escalabilidad

La arquitectura distribuida permite analizar la escalabilidad de los servicios individualmente.

No todos los componentes necesitan crecer al mismo ritmo.

Por ejemplo, el volumen de lecturas generadas por sensores puede crecer considerablemente más rápido que la cantidad de usuarios o reglas de alerta.

Esto permite identificar los componentes con mayor probabilidad de convertirse en puntos de presión antes de escalar toda la plataforma por igual.

## Escalado horizontal

El escalado horizontal consiste en disponer de múltiples instancias de un mismo servicio y distribuir las solicitudes entre ellas.

La infraestructura productiva actual de Agrónoma se encuentra desplegada sobre cPanel compartido y no implementa escalado horizontal dinámico.

Por esta razón, el escalado horizontal debe considerarse una capacidad a evaluar y comprobar fuera del entorno productivo actual antes de incorporarlo a una futura infraestructura.

## Pruebas de escalabilidad

La documentación técnica contempla un laboratorio separado para comparar el comportamiento de una instancia frente a varias instancias.

Este tipo de prueba permite analizar cómo cambia el comportamiento del sistema al aumentar la cantidad de instancias disponibles y distribuir las solicitudes.

El laboratorio se mantiene separado del despliegue productivo debido a las restricciones del hosting utilizado actualmente.

## Sharding

Una posible evolución del sistema es particionar las lecturas de sensores.

La tabla `lecturas_sensores` representa uno de los conjuntos de datos con mayor potencial de crecimiento porque recibe registros producidos continuamente por dispositivos.

Una futura estrategia podría distribuir estas lecturas entre distintos fragmentos de almacenamiento.

El sharding no forma parte de la implementación productiva actual y se documenta como una alternativa de evolución ante un crecimiento considerable del volumen de telemetría.

## Escalabilidad de bases de datos

Actualmente cada servicio utiliza una única base MySQL y no existen réplicas.

Esto significa que separar el sistema en microservicios no proporciona automáticamente alta disponibilidad ni escalabilidad horizontal de la persistencia.

Una evolución futura deberá analizar por separado:

- replicación;
- particionamiento;
- almacenamiento de telemetría;
- crecimiento de índices;
- estrategia de copias de seguridad.

La solución deberá seleccionarse según el problema real de carga y no únicamente por utilizar una arquitectura distribuida.

## Escalabilidad del procesamiento asíncrono

Los procesos asíncronos permiten separar determinadas cargas del camino principal de las solicitudes.

Los eventos asociados a alertas y los trabajos relacionados con notificaciones pueden procesarse independientemente de la operación que los originó.

La infraestructura actual está condicionada por las restricciones del hosting y no utiliza workers permanentes.

Una infraestructura futura con procesos persistentes permitiría aumentar independientemente la capacidad de los consumidores según el volumen de mensajes.

## Escalabilidad de integraciones externas

Las APIs externas también pueden convertirse en límites del sistema.

Realizar una llamada externa en cada solicitud aumentaría:

- latencia;
- consumo de cuotas;
- dependencia de disponibilidad;
- probabilidad de propagación de fallos.

Agrónoma reduce estas dependencias utilizando estrategias como actualización controlada y reutilización temporal de información cuando corresponde.

Los circuit breakers y fallbacks complementan esta estrategia cuando una integración externa deja de responder.

## CI/CD

La evolución del sistema requiere que despliegues y modificaciones puedan verificarse de manera repetible.

La documentación técnica contempla GitHub Actions como mecanismo de integración y despliegue continuo.

La automatización permite ejecutar verificaciones de manera consistente antes de incorporar cambios y disminuye la dependencia de procedimientos manuales susceptibles de error.

## Monitoreo

La escalabilidad debe acompañarse de observabilidad.

Agrónoma dispone de:

- logs de aplicación;
- identificadores `X-Request-Id`;
- health checks;
- códigos de error controlados.

Estos mecanismos proporcionan evidencia para detectar fallos y localizar el componente responsable de una operación.

El monitoreo es especialmente importante en una arquitectura distribuida, ya que una solicitud puede depender de varios componentes antes de completarse.

## Limitaciones actuales

La arquitectura actual mantiene algunas restricciones conocidas:

- un único API Gateway;
- una única instancia productiva de cada servicio;
- una base MySQL por servicio sin réplicas;
- hosting compartido mediante cPanel;
- ausencia de escalado dinámico en producción;
- dependencia de proveedores externos;
- procesamiento de colas adaptado a las restricciones del hosting.

Estas limitaciones permiten diferenciar las estrategias efectivamente implementadas de aquellas planteadas como evolución futura.
