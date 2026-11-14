# Módulo 1 \- Arquitectura

## Objetivo

Este módulo documenta la arquitectura de **Agrónoma**, un Sistema de Soporte a la Toma de Decisiones (DSS) orientado al ámbito agropecuario.

La arquitectura busca separar las distintas responsabilidades del sistema en servicios independientes y permitir la integración de información de campo, almacenamiento de granos, mercado y alertas detrás de un único punto de entrada.

Para describir la arquitectura se utiliza el **modelo 4\+1 de Kruchten**, analizando el sistema desde las vistas lógica, de desarrollo, de procesos y física, y validándolas mediante escenarios concretos de funcionamiento.

## Clasificación de la arquitectura

Agrónoma puede analizarse desde dos ejes diferentes:

| Eje             | Clasificación                  |
| --------------- | ------------------------------ |
| Infraestructura | Distribuida, cliente\-servidor |
| Desarrollo      | Microservicios por dominio     |

La infraestructura es distribuida porque los distintos servicios funcionan como nodos autónomos y se comunican mediante la red, sin compartir memoria.

Desde el punto de vista del desarrollo, las responsabilidades están separadas por dominio. Cada servicio administra su propia lógica y, cuando corresponde, sus propios datos.

Esta separación evita construir un backend monolítico y permite que cada parte del sistema tenga responsabilidades claramente delimitadas.

## Arquitectura general

El usuario interactúa con una aplicación web desarrollada en React.

El frontend no accede directamente a los servicios internos. Todas las solicitudes pasan primero por el servicio api, que implementa el patrón **API Gateway**.

La estructura general es:

                         Frontend React

                         agronoma.site

                               \|

                         HTTPS \+ JSON

                               \|

                               v

                         API Gateway

                              api

                               \|

          \+\-\-\-\-\-\-\-\-\-\-\-\+\-\-\-\-\-\-\-\-\+\-\-\-\-\-\-\-\-\+\-\-\-\-\-\-\-\-\-\-\-\+

          \|           \|                 \|           \|

          v           v                 v           v

        auth        campo             silos      mercado

                                                   \|

                                                   \| REST

                                                   v

                                                 silos

          campo \-\-\-\-\-\-\-\-\+

                        \|

          silos \-\-\-\-\-\-\-\-\+\-\-\-\-> eventos \-\-\-\-> alertas

                        \|

          mercado \-\-\-\-\-\-\+

          campo   \-\-\-\-> Open\-Meteo

          mercado \-\-\-\-> granos.ar / DolarAPI

El Gateway funciona como punto central de acceso, mientras que los servicios internos mantienen las responsabilidades de sus respectivos dominios.

## Componentes principales

### Frontend

Aplicación web responsable de presentar la información al usuario.

Consume el sistema exclusivamente mediante el API Gateway y permite visualizar y operar sobre la información proporcionada por los diferentes servicios.

### API Gateway (api)

Es la única puerta de entrada desde el frontend hacia los servicios internos.

Entre sus responsabilidades se encuentran:

- enrutar solicitudes;
- validar la autenticación;
- aplicar CORS;
- aplicar limitación de solicitudes;
- propagar la identidad del usuario hacia los servicios;
- aplicar circuit breakers frente a fallos;
- proporcionar operaciones de fachada como /v1/resumen.

El Gateway no posee una base de datos de dominio propia.

### auth

Centraliza la identidad y autenticación de usuarios y dispositivos.

Gestiona usuarios, roles y tokens de acceso. Es el único servicio que trabaja directamente con las contraseñas de los usuarios.

### campo

Gestiona establecimientos rurales, lotes, cultivos, dispositivos y lecturas de sensores.

También integra información meteorológica y origina eventos relacionados con la telemetría recibida.

### silos

Administra los silos, el stock almacenado y sus movimientos.

Las operaciones sobre stock se protegen mediante transacciones y bloqueo de registros para evitar inconsistencias frente a operaciones concurrentes.

### mercado

Implementa las funciones del DSS relacionadas con información económica.

Gestiona cotizaciones, divisas, insumos, márgenes e índice de oportunidad de venta. También encapsula la integración con proveedores externos de precios y tipo de cambio.

### alertas

Consume los eventos generados por los demás servicios y aplica reglas para generar alertas.

Las alertas pueden entregarse al frontend y formar parte del proceso de notificación del sistema.

## Modelo 4\+1

### Vista lógica

La vista lógica representa las funcionalidades que utiliza el usuario y los principales conceptos del dominio.

En Agrónoma aparecen, entre otros:

- usuarios;
- establecimientos;
- lotes;
- dispositivos;
- lecturas;
- registros climáticos;
- silos;
- movimientos de stock;
- cotizaciones;
- márgenes;
- índices de venta;
- reglas de alerta;
- alertas.

La separación funcional se refleja directamente en los servicios responsables de cada dominio.

### Vista de desarrollo

El código se divide en proyectos independientes según responsabilidad:

front/

api/

auth/

campo/

silos/

mercado/

alertas/

Esta organización permite separar la interfaz, el Gateway y los dominios de negocio.

Los servicios backend están desarrollados con Laravel, mientras que el frontend utiliza React.

La interacción entre dominios no se resuelve mediante acceso directo a las tablas de otros servicios. Las referencias entre servicios son lógicas y la comunicación se realiza mediante APIs o eventos.

### Vista de procesos

La vista de procesos describe cómo colaboran los componentes mientras el sistema está en ejecución.

Agrónoma combina diferentes mecanismos:

- REST para comunicación síncrona;
- eventos para comunicación desacoplada;
- SSE para actualización del feed de alertas;
- webhooks para recepción de eventos externos;
- mecanismos de exclusión mutua para operaciones concurrentes;
- circuit breakers para evitar insistir sobre servicios no disponibles.

El Gateway recibe las solicitudes externas y las deriva al servicio correspondiente.

Algunas operaciones producen eventos que posteriormente son procesados por alertas, evitando que el productor del evento necesite conocer la lógica de generación de alertas.

### Vista física

En producción, los componentes se exponen mediante dominios o subdominios independientes.

agronoma.site

api.agronoma.site

auth.agronoma.site

campo.agronoma.site

silos.agronoma.site

mercado.agronoma.site

alertas.agronoma.site

Los servicios de dominio mantienen bases de datos separadas.

El Gateway no posee una base de datos de negocio.

La comunicación con servicios externos también forma parte de esta vista, incluyendo las fuentes utilizadas para clima, cotizaciones y mensajería.

## Escenarios de validación

La vista "\+1" del modelo se utiliza para comprobar que las otras vistas son coherentes frente a situaciones reales.

### Recepción de una lectura de sensor

1. Un dispositivo envía una lectura.
2. La solicitud pasa por el Gateway.
3. campo recibe y almacena la lectura.
4. La secuencia del dispositivo permite detectar duplicados y mantener el orden lógico.
5. campo publica el evento correspondiente.
6. alertas procesa posteriormente ese evento y evalúa sus reglas.

Este escenario relaciona dispositivos y lotes de la vista lógica, el servicio campo de la vista de desarrollo y la comunicación entre componentes de las vistas de procesos y física.

### Dos salidas simultáneas de un silo

Dos solicitudes pueden intentar retirar stock del mismo silo al mismo tiempo.

El servicio silos protege esta operación mediante una transacción y lockForUpdate(), evitando que ambas operaciones utilicen simultáneamente un mismo valor de stock y generen un resultado inconsistente.

Este escenario demuestra cómo una decisión de arquitectura y persistencia protege una regla del dominio ante concurrencia.

### El precio alcanza un objetivo del productor

1. mercado obtiene o actualiza una cotización.
2. La cotización se almacena y se genera el evento correspondiente.
3. alertas procesa el evento.
4. Se comprueban los objetivos de precio configurados.
5. Si corresponde, se genera una alerta.
6. La alerta puede llegar al usuario mediante los mecanismos de notificación disponibles.

El escenario demuestra la separación entre la obtención de información económica y la decisión de notificar al usuario.

## Decisiones arquitectónicas principales

### API Gateway como único punto de entrada

El frontend no necesita conocer la ubicación de todos los servicios.

api centraliza las responsabilidades transversales relacionadas con las solicitudes externas y oculta la distribución interna del backend.

### Separación de datos

Cada servicio administra los datos correspondientes a su dominio.

Un servicio no realiza JOIN con tablas pertenecientes a otro servicio ni necesita las credenciales de sus bases de datos.

Cuando debe conservarse una relación entre dominios se utiliza una referencia lógica mediante identificadores.

### Comunicación desacoplada

No todas las operaciones requieren una respuesta inmediata de otro componente.

Los eventos permiten separar al productor de información del procesamiento posterior realizado por alertas, reduciendo el acoplamiento entre servicios.

### Aislamiento de integraciones externas

Las integraciones con terceros quedan encapsuladas dentro del dominio al que pertenecen.

Por ejemplo, campo concentra la integración climática y mercado las integraciones relacionadas con precios y divisas.

De esta manera, un cambio de proveedor externo no implica modificar todos los componentes del sistema.
