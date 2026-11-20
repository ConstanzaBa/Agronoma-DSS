# Módulo 4 - Middleware y Componentes Distribuidos

## Introducción

Agrónoma utiliza componentes de middleware para permitir que el frontend y los distintos servicios del backend puedan comunicarse manteniendo responsabilidades separadas.

El principal componente de intermediación es `api`, que implementa el patrón API Gateway y constituye el único punto de acceso del frontend hacia los servicios internos.

Además, el sistema utiliza mecanismos de acceso a datos, contratos HTTP, versionado de API, descubrimiento mediante configuración y health checks para facilitar la interoperabilidad entre sus componentes.

## API Gateway como middleware

El servicio `api` actúa como intermediario entre el frontend y los servicios internos:

- `auth`
- `campo`
- `silos`
- `mercado`
- `alertas`

Su objetivo es evitar que el cliente tenga que conocer directamente la ubicación y particularidades de cada servicio.

El flujo general es:

Frontend → API Gateway → Servicio correspondiente

El Gateway concentra responsabilidades transversales que no deberían repetirse en cada interacción realizada por el frontend.

Entre ellas se encuentran:

- autenticación;
- CORS;
- rate limiting;
- enrutamiento;
- resolución del contexto del usuario;
- propagación de identidad y contexto;
- identificación de solicitudes;
- tratamiento de fallos mediante circuit breaker.

De esta manera funciona como una capa de middleware entre el cliente y los servicios de negocio.

## Enrutamiento

Las operaciones públicas utilizan el prefijo `/v1`.

El Gateway determina qué servicio debe atender cada solicitud y la reenvía hacia el destino correspondiente.

Por ejemplo, las operaciones asociadas a campo son dirigidas al servicio `campo`, mientras que las relacionadas con silos son enviadas al servicio `silos`.

El frontend utiliza así una única URL base y no necesita almacenar las direcciones individuales de los microservicios.

El Gateway no reenvía públicamente las rutas `/interno/*`, reservadas a la comunicación entre servicios: ante un intento responde como recurso inexistente (404).

## Propagación de identidad

Una vez validada una solicitud, el Gateway resuelve el contexto del usuario mediante campo y transmite identidad y contexto hacia los servicios internos mediante cabeceras controladas por el propio Gateway.

Entre ellas se utilizan:

- `X-Usuario-Id`
- `X-Cuenta-Id`
- `X-Usuario-Rol`
- `X-Establecimiento-Id`, cuando corresponde (puede no existir para un administrador, que opera sobre su cuenta)
- `X-Autenticable-Tipo`
- `X-Autenticable-Id`
- `X-Request-Id`

Las cabeceras de identidad recibidas originalmente desde el cliente no se consideran confiables. El Gateway construye la información de identidad a partir del resultado del proceso de autenticación.

El contexto proviene de `GET /interno/usuarios/{id}/contexto` en `campo`, que devuelve `usuario_id`, `cuenta_id`, rol y `establecimiento_id` (este último solo para empleados; `null` para administradores). El Gateway lo consulta en cada solicitud, sin caché, para que una baja o un traslado tengan efecto inmediato.

Estas cabeceras son contexto interno resuelto por el backend: el usuario no puede elegir libremente su cuenta, rol ni establecimiento desde el frontend.

Esto permite centralizar la autenticación externa sin trasladar esa responsabilidad completa a todos los servicios.

## Identificación de solicitudes

Cada solicitud recibe un `X-Request-Id`.

Este identificador permite relacionar registros pertenecientes a una misma petición cuando la operación atraviesa diferentes componentes del sistema.

Su utilización facilita el seguimiento de solicitudes dentro de una arquitectura distribuida.

## CORS

El Gateway centraliza la política CORS utilizada para la comunicación entre el frontend y el backend.

Los orígenes permitidos se definen mediante configuración, evitando distribuir esta decisión por todos los clientes y servicios.

También se gestionan desde el Gateway las respuestas de preflight necesarias para la comunicación desde el navegador.

## Rate limiting

El Gateway aplica límites de solicitudes para proteger el acceso al sistema.

Los límites pueden diferenciar las operaciones públicas, como autenticación, de las solicitudes correspondientes a usuarios autenticados.

Cuando se supera un límite, el sistema puede rechazar temporalmente las nuevas solicitudes antes de que lleguen a los servicios internos.

Esto permite aplicar una política transversal desde un único componente.

## Acceso a datos

Los servicios Laravel utilizan Eloquent/PDO como capa de acceso a sus respectivas bases de datos.

Este mecanismo funciona como intermediario entre el modelo de objetos utilizado por la aplicación y la representación relacional almacenada en MySQL.

Cada servicio accede únicamente a su propia persistencia.

La utilización de una capa de acceso a datos no elimina la separación de dominios: un servicio no utiliza Eloquent para consultar directamente las tablas pertenecientes a otro servicio.

## Protocolo de interoperabilidad

Agrónoma utiliza REST sobre HTTP y representa la información intercambiada mediante JSON.

Este mecanismo se utiliza tanto para solicitudes del frontend hacia el Gateway como para aquellas comunicaciones síncronas internas que requieren una respuesta inmediata.

REST y JSON proporcionan un contrato común entre componentes desarrollados y desplegados de forma independiente.

## Versionado

Las rutas públicas se encuentran versionadas mediante el prefijo:

`/v1`

El versionado permite evolucionar los contratos manteniendo explícita la versión de interfaz utilizada por los consumidores.

Los cambios compatibles pueden ampliar una respuesta con información opcional, mientras que los cambios que modifiquen el significado de campos existentes requieren evaluar la compatibilidad del contrato.

## Contratos

En una arquitectura distribuida, la comunicación entre servicios constituye un contrato.

Los contratos deben indicar qué operación está disponible, qué información recibe y qué respuesta produce.

La documentación técnica de Agrónoma contempla contratos OpenAPI, generados mediante Scramble, para las APIs y contratos de eventos para la comunicación asíncrona. El Gateway expone además `GET /v1/estado` (restringido a administradores) y la fachada `GET /v1/resumen`. Los archivos OpenAPI son la fuente de verdad de rutas, métodos y parámetros, y permiten distinguir rutas públicas, autenticadas, administrativas e internas entre servicios.

El objetivo es que productores y consumidores compartan una definición explícita de la información intercambiada, evitando depender únicamente del conocimiento interno de la implementación.

## Descubrimiento de servicios

Agrónoma no necesita un servidor especializado de descubrimiento como Consul o etcd.

El Gateway conoce las direcciones de los servicios mediante configuración del lado servidor.

Conceptualmente:

`SERVICIO_AUTH_URL`

`SERVICIO_CAMPO_URL`

`SERVICIO_SILOS_URL`

`SERVICIO_MERCADO_URL`

`SERVICIO_ALERTAS_URL`

En producción, los servicios cuentan con subdominios estables.

La combinación de DNS y variables de entorno funciona como mecanismo de localización dentro de la infraestructura actual.

Esta solución resulta adecuada porque existe un Gateway central que conoce los destinos y la infraestructura no incorpora réplicas dinámicas que aparezcan y desaparezcan constantemente.

## Health checks

El Gateway y los servicios `campo`, `silos`, `mercado` y `alertas` exponen mecanismos de comprobación de estado, `GET /health/live` y `GET /health/ready`, que permiten conocer si el componente está funcionando. En esos cuatro servicios, `ready` verifica la conexión a la base de datos y responde 503 si no responde; `alertas` informa además la cantidad de trabajos pendientes.

Se diferencia conceptualmente entre:

- **Liveness:** determina si el proceso se encuentra activo.
- **Readiness:** determina si el servicio se encuentra en condiciones de atender correctamente solicitudes.

Esta distinción es importante porque un proceso puede encontrarse ejecutándose y, aun así, no estar preparado para atender operaciones debido a una dependencia necesaria que no está disponible.

## Componentes distribuidos

Cada componente de Agrónoma mantiene una responsabilidad específica.

`auth` administra identidad y autenticación.

`campo` gestiona información productiva, dispositivos, lecturas y clima.

`silos` administra almacenamiento y movimientos de granos.

`mercado` concentra cotizaciones, integraciones económicas y lógica del DSS comercial.

`alertas` procesa eventos y genera alertas.

`api` proporciona la intermediación necesaria para presentar estos servicios al cliente mediante un punto de acceso común.

La interacción entre estos componentes se realiza mediante interfaces explícitas en lugar de compartir directamente memoria o tablas.

## Modelo de actores

Agrónoma no implementa un Actor Model completo.

Los problemas de concurrencia identificados en el sistema son acotados y pueden resolverse utilizando herramientas más sencillas, como transacciones, bloqueos de filas e idempotencia.

Por ejemplo, la concurrencia sobre el stock de un silo se protege mediante `lockForUpdate()`.

Introducir un framework de actores únicamente para resolver estos casos añadiría complejidad sin una necesidad concreta en el alcance actual del sistema.

## Decisiones del diseño

La infraestructura disponible condiciona algunas de las decisiones de middleware.

La aplicación se despliega sobre cPanel compartido, por lo que el diseño utiliza componentes compatibles con HTTP convencional y con las capacidades disponibles en ese entorno.

Por este motivo, REST y JSON constituyen el mecanismo principal de interoperabilidad.

El sistema evita incorporar tecnologías adicionales cuando la misma necesidad puede resolverse mediante mecanismos más simples compatibles con la infraestructura real.

## Flujo de una solicitud

Una solicitud típica puede describirse de la siguiente manera:

1. El frontend realiza una petición a una ruta `/v1`.
2. El Gateway recibe la solicitud.
3. Se genera un identificador para poder seguir la petición.
4. Se aplican las políticas transversales correspondientes.
5. Si la operación requiere autenticación, se valida la identidad.
6. Para `silos`, `mercado` y `alertas` (no para `auth` ni `campo`), el Gateway resuelve el contexto del usuario (cuenta, rol y establecimiento) mediante campo en cada solicitud. Si campo no responde devuelve 503, si el usuario no tiene cuenta devuelve 403, y nunca se continúa sin contexto.
7. El Gateway determina el servicio responsable.
8. Se construyen las cabeceras internas necesarias.
9. La petición se reenvía al servicio.
10. El servicio ejecuta su lógica de negocio.
11. La respuesta vuelve al Gateway.
12. El Gateway devuelve el resultado al frontend.

Desde el punto de vista del frontend, todo el backend continúa presentándose como una única interfaz aunque internamente participe más de un componente.
