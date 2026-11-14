# Módulo 2 - Infraestructura Distribuida

## Introducción

Agrónoma es un Sistema de Soporte a la Toma de Decisiones (DSS) para productores agropecuarios cuya infraestructura está organizada de forma distribuida.

El sistema separa sus responsabilidades en servicios autónomos que se comunican mediante la red. El frontend actúa como cliente, mientras que el backend está compuesto por un API Gateway y distintos servicios especializados por dominio.

La distribución permite aislar responsabilidades como autenticación, gestión de campo, almacenamiento, información de mercado y generación de alertas.

## Arquitectura distribuida

Agrónoma utiliza una arquitectura distribuida basada en el modelo cliente-servidor.

El frontend React funciona como cliente del sistema y utiliza una única dirección de acceso al backend.

Las solicitudes ingresan a través del servicio api, que implementa el patrón API Gateway y se encarga de dirigir cada petición hacia el servicio correspondiente.

Los principales componentes son:

| Componente | Responsabilidad                                                  |
| ---------- | ---------------------------------------------------------------- |
| Frontend   | Interfaz utilizada por el productor                              |
| api        | API Gateway y punto de entrada al backend                        |
| auth       | Identidad, usuarios y autenticación                              |
| campo      | Establecimientos, lotes, dispositivos, telemetría y clima        |
| silos      | Almacenamiento y movimientos de granos                           |
| mercado    | Cotizaciones, divisas, márgenes e índice de oportunidad de venta |
| alertas    | Procesamiento y entrega de alertas                               |

Los servicios son independientes entre sí y no comparten memoria.

## Distribución por dominio

La división de Agrónoma no se realizó simplemente para separar código, sino para representar responsabilidades diferentes del negocio.

Cada servicio es responsable de su propio dominio.

### Auth

Centraliza la identidad de usuarios y dispositivos.

Gestiona usuarios, roles y tokens de acceso.

### Campo

Representa la información productiva y geográfica.

Gestiona establecimientos rurales, lotes, cultivos, dispositivos, lecturas de sensores, registros de lluvia e información meteorológica.

### Silos

Gestiona almacenamiento de granos, estado de los silos y movimientos de entrada y salida.

### Mercado

Concentra las funciones económicas y de soporte a decisiones comerciales.

Procesa cotizaciones, divisas, insumos, márgenes e índices de oportunidad de venta.

### Alertas

Procesa los eventos producidos por otros servicios y evalúa las reglas necesarias para generar alertas.

### API Gateway

Centraliza el acceso externo y oculta al frontend la distribución interna de servicios.

## Modelo cliente-servidor

Desde el punto de vista del usuario, Agrónoma mantiene una relación cliente-servidor sencilla.

El frontend realiza las solicitudes al API Gateway y no necesita conocer dónde está desplegado cada servicio interno.

El Gateway recibe la solicitud, determina el destino y se comunica con el servicio correspondiente.

Esta organización permite presentar al frontend una interfaz de acceso unificada aun cuando internamente el backend esté distribuido.

## Independencia de datos

Los servicios que necesitan persistencia mantienen bases de datos independientes.

Una regla central de la arquitectura establece que un servicio no realiza operaciones JOIN sobre tablas pertenecientes a otro servicio y tampoco utiliza las credenciales de la base de datos de otro dominio.

Las relaciones que atraviesan servicios se representan mediante referencias lógicas.

Por ejemplo, un servicio puede conservar el identificador de un usuario perteneciente a auth, pero no utiliza una clave foránea que atraviese las bases de ambos servicios.

Esta decisión mantiene la autonomía de cada dominio y reduce el acoplamiento de datos.

## Comunicación entre nodos

Los servicios se coordinan mediante mensajes y solicitudes de red.

Agrónoma utiliza diferentes mecanismos según el tipo de interacción:

- REST para operaciones que requieren comunicación síncrona.
- Eventos para comunicación desacoplada.
- SSE para entregar alertas al frontend.
- Webhooks para recibir determinados eventos externos.

De esta forma no existe una única forma de comunicación para todas las situaciones. Cada mecanismo se utiliza según las necesidades de la operación.

## Transparencia de acceso

El usuario no necesita conocer la distribución interna del backend.

El frontend utiliza una única interfaz proporcionada por el API Gateway.

Esta característica proporciona transparencia de acceso: desde el punto de vista del cliente, la utilización del sistema es uniforme aunque una operación termine siendo atendida por campo, silos, mercado, alertas o auth.

## Transparencia de ubicación

La ubicación concreta de cada servicio no forma parte de la lógica del frontend.

Las direcciones de los servicios son configuradas en el servidor y el Gateway se encarga de localizar cada destino.

Esto permite separar la configuración de despliegue del comportamiento funcional del cliente.

## Transparencia de concurrencia

El sistema contempla situaciones donde distintas operaciones pueden ejecutarse simultáneamente.

Un ejemplo importante ocurre en el servicio silos.

Dos solicitudes podrían intentar retirar toneladas del mismo silo al mismo tiempo. Para evitar inconsistencias, la actualización del stock se realiza utilizando una transacción y bloqueo del registro correspondiente.

También se utilizan mecanismos de bloqueo para evitar evaluaciones o actualizaciones concurrentes sobre determinados procesos.

La distribución no elimina la concurrencia; obliga a identificarla y controlarla explícitamente.

## Transparencia y manejo de fallos

En un sistema distribuido, un servicio puede fallar mientras los demás continúan funcionando.

Agrónoma contempla esta situación y evita asumir que todos sus componentes siempre estarán disponibles.

El Gateway utiliza mecanismos de circuit breaker para evitar realizar continuamente solicitudes contra un servicio que no está respondiendo.

Cuando existe información externa que puede quedar desactualizada, el sistema puede utilizar el último dato almacenado e indicar que ese dato no está actualizado.

Por lo tanto, los fallos se gestionan intentando degradar el servicio de manera controlada en lugar de asumir disponibilidad permanente.

## Orden de eventos y ausencia de reloj global

Los distintos nodos no deben depender exclusivamente de que sus relojes estén perfectamente sincronizados.

En las lecturas de sensores se utiliza una secuencia asociada a cada dispositivo.

La combinación del identificador del dispositivo y su número de secuencia permite detectar repeticiones y determinar el orden lógico de sus lecturas.

La fecha continúa siendo útil como información del dominio, pero la consistencia de las lecturas no depende únicamente del reloj físico del sensor.

## Infraestructura física

En producción, los componentes principales se identifican mediante dominios y subdominios independientes.

| Componente    | Dominio               |
| ------------- | --------------------- |
| Frontend      | agronoma.site         |
| Gateway       | api.agronoma.site     |
| Autenticación | auth.agronoma.site    |
| Campo         | campo.agronoma.site   |
| Silos         | silos.agronoma.site   |
| Mercado       | mercado.agronoma.site |
| Alertas       | alertas.agronoma.site |

Los servicios internos son configurables mediante variables de entorno, evitando acoplar sus ubicaciones directamente al código.

## Bases de datos distribuidas

Los servicios de dominio mantienen su propia persistencia cuando la necesitan:

- auth posee su base de datos;
- campo posee su base de datos;
- silos posee su base de datos;
- mercado posee su base de datos;
- alertas posee su base de datos.

El Gateway no posee una base de datos de negocio.

Esta distribución permite que los datos permanezcan bajo responsabilidad del servicio al que pertenecen.

## Puntos únicos de fallo

Distribuir el sistema no significa automáticamente obtener alta disponibilidad.

La implementación actual mantiene un único servidor MySQL para cada servicio y el API Gateway constituye el punto de entrada al backend.

Por ello existen componentes cuya caída puede afectar determinadas operaciones.

Esta limitación se reconoce explícitamente dentro de la arquitectura en lugar de asumir que la utilización de microservicios elimina por sí misma los puntos únicos de fallo.

## Ejemplo de funcionamiento distribuido

Puede observarse la distribución mediante la recepción de una lectura de sensor:

1. Un dispositivo genera una lectura.
2. La solicitud entra al sistema.
3. El Gateway valida y dirige la petición.
4. Campo procesa y almacena la lectura.
5. La secuencia permite controlar duplicados y orden lógico.
6. Campo genera el evento correspondiente.
7. Alertas procesa posteriormente ese evento.
8. Si una regla se cumple, se genera una alerta.
9. La información puede finalmente ser presentada al usuario en el frontend.

Este flujo atraviesa distintos componentes independientes sin necesitar que todos compartan una única base de datos o un único proceso.

## Limitaciones

La infraestructura distribuida implementada busca ser compatible con las restricciones reales de despliegue del proyecto.

Actualmente no se implementan mecanismos como replicación de bases de datos, consenso distribuido mediante Raft o etcd, ni orquestación mediante Kubernetes.

La ausencia de estos mecanismos es una decisión explícita acorde al alcance y a la infraestructura disponible.

Por este motivo, Agrónoma debe considerarse un sistema distribuido, pero no un sistema de alta disponibilidad.
