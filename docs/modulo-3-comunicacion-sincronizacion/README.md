# Módulo 3 - Comunicación y Sincronización

## Introducción

Agrónoma es un sistema distribuido compuesto por servicios independientes que necesitan intercambiar información y coordinar operaciones sin compartir memoria ni bases de datos.

Para resolver estas necesidades, el sistema combina distintos mecanismos de comunicación y sincronización según el tipo de interacción:

- REST para comunicación síncrona.
- Eventos y colas para comunicación asíncrona.
- SSE para el envío continuo de alertas al frontend.
- Webhooks para eventos iniciados desde sistemas externos.
- Idempotencia para tolerar solicitudes o eventos repetidos.
- Secuencias lógicas para ordenar lecturas.
- Bloqueos para proteger operaciones concurrentes.

La elección del mecanismo depende de si el emisor necesita una respuesta inmediata, del nivel de desacoplamiento requerido y del recurso que debe protegerse.

## Comunicación síncrona

La comunicación síncrona se utiliza cuando un componente necesita obtener una respuesta para poder completar la operación en curso.

Agrónoma utiliza principalmente HTTP REST con intercambio de información en JSON.

El frontend se comunica exclusivamente con el API Gateway. El Gateway recibe las solicitudes externas y las dirige al servicio responsable.

Por ejemplo:

```text
Frontend
    |
    | HTTPS / JSON
    v
API Gateway
    |
    +----> auth
    +----> campo
    +----> silos
    +----> mercado
    +----> alertas
```

Los servicios también pueden realizar comunicaciones síncronas internas cuando una operación realmente necesita información perteneciente a otro dominio.

El objetivo es evitar cadenas síncronas innecesariamente largas, ya que el tiempo de respuesta y los posibles fallos pueden propagarse entre los servicios involucrados.

## Comunicación asíncrona

No todas las operaciones necesitan que el productor espere a que termine todo el procesamiento.

Agrónoma utiliza eventos para desacoplar determinadas acciones.

Los servicios pueden publicar un evento como consecuencia de una operación y continuar con su responsabilidad principal. Posteriormente, otro servicio puede consumir ese evento y ejecutar el procesamiento correspondiente.

Este mecanismo se utiliza especialmente en el sistema de alertas.

El flujo conceptual es:

```text
Servicio productor
       |
       | publica evento
       v
Agronoma.eventos
       |
       v
  alertas.eventos
       |
       v
Servicio alertas
```

De este modo, el servicio que genera información no necesita contener también la lógica completa de generación y entrega de alertas.

## Eventos del sistema

Los eventos representan hechos que ya ocurrieron dentro de Agrónoma.

Por ejemplo, la recepción de una lectura de sensor puede originar un evento que posteriormente es procesado por el servicio de alertas.

El productor del evento informa el hecho ocurrido, mientras que el consumidor decide qué acciones realizar a partir de ese hecho.

Esta separación reduce el acoplamiento entre los servicios.

## Semántica de entrega

En un sistema distribuido no debe asumirse que un mensaje llegará exactamente una vez.

Agrónoma contempla una semántica de entrega de al menos una vez y utiliza mecanismos de deduplicación para que la repetición de un mensaje no produzca efectos duplicados.

La combinación de reentrega e idempotencia permite obtener un comportamiento efectivamente único desde el punto de vista funcional, aunque el transporte pueda entregar nuevamente el mismo mensaje.

## Idempotencia

La idempotencia permite procesar repetidamente una misma solicitud o evento sin duplicar sus efectos.

Agrónoma utiliza diferentes identificadores según el contexto.

### Lecturas de sensores

Las lecturas utilizan la combinación:

```text
(dispositivo_id, secuencia)
```

como identificación lógica de la lectura.

Si un dispositivo vuelve a enviar una secuencia ya procesada, el sistema puede reconocer que la información ya fue recibida.

### Operaciones con clave de idempotencia

Determinadas operaciones utilizan una `clave_idempotencia` para impedir que el reenvío de una misma solicitud produzca registros duplicados.

### Eventos

Los eventos utilizan un identificador que permite reconocer aquellos que ya fueron procesados por el consumidor.

Estos mecanismos son especialmente importantes porque una red o una cola puede ocasionar reintentos y reentregas.

## Orden lógico de lecturas

Agrónoma evita depender exclusivamente del reloj físico de los diferentes dispositivos.

Cada dispositivo mantiene una secuencia creciente para sus lecturas.

Por ejemplo:

```text
Dispositivo 15

secuencia 101
secuencia 102
secuencia 103
```

La secuencia permite establecer un orden lógico para las lecturas generadas por un mismo dispositivo.

De esta forma, el sistema puede detectar repeticiones y razonar sobre el orden de recepción sin asumir que los relojes de todas las máquinas están perfectamente sincronizados.

Este mecanismo funciona como un reloj lógico simple aplicado al dominio de los sensores.

## Exclusión mutua

La comunicación distribuida introduce situaciones donde dos operaciones pueden intentar modificar simultáneamente el mismo recurso.

Agrónoma utiliza mecanismos de exclusión mutua en aquellos puntos donde la concurrencia podría producir inconsistencias.

### Stock de silos

Un caso representativo ocurre cuando dos solicitudes intentan retirar stock del mismo silo al mismo tiempo.

Conceptualmente:

```text
Solicitud A ----+
                +----> mismo silo
Solicitud B ----+
```

La operación se protege mediante una transacción y `lockForUpdate()`.

De esta forma, una operación obtiene el bloqueo sobre el registro mientras actualiza el stock y la otra debe esperar antes de trabajar con ese mismo dato.

Esto evita condiciones de carrera que podrían producir un stock incorrecto.

## Bloqueos de procesos

Además de los bloqueos de base de datos, Agrónoma utiliza `Cache::lock` en procesos que no deben ejecutarse simultáneamente.

Un caso es el procesamiento controlado de trabajos mediante:

`queue:work --stop-when-empty`

El lock impide que varias solicitudes intenten iniciar simultáneamente el mismo procesamiento.

La estrategia permite resolver un problema concreto de exclusión mutua dentro de las restricciones del entorno de despliegue.

## Server-Sent Events (SSE)

El servicio de alertas utiliza Server-Sent Events para proporcionar al frontend un flujo de actualizaciones.

A diferencia de una petición REST convencional, donde el cliente realiza una solicitud y recibe una respuesta que termina la interacción, SSE permite mantener un flujo desde el servidor hacia el navegador.

En Agrónoma se utiliza para el feed de alertas.

La ruta pública actual a través del Gateway es:

`/v1/alertas/alertas/feed`

SSE resulta adecuado porque el flujo principal necesario en este caso es servidor → cliente.

## Webhooks

Agrónoma contempla también comunicación iniciada por un tercero mediante webhook.

El caso implementado pertenece al servicio de mercado.

El webhook utiliza una firma HMAC para comprobar la autenticidad de la solicitud recibida.

A diferencia de las operaciones habituales del frontend, este webhook no atraviesa el API Gateway: el proveedor se comunica directamente con el servicio mercado mediante el endpoint correspondiente y su firma.

## Comunicación con servicios externos

Agrónoma también se comunica con proveedores ajenos al sistema.

Entre ellos se encuentran:

- Open-Meteo para información meteorológica.
- granos.ar para información de precios de granos.
- DolarAPI para información del tipo de cambio.

Estas integraciones permanecen encapsuladas dentro del servicio que necesita cada información.

Campo concentra la integración meteorológica y mercado concentra las integraciones económicas.

## REST, eventos y SSE

No existe un único mecanismo de comunicación adecuado para todas las operaciones.

| Mecanismo    | Uso principal                                       |
| ------------ | --------------------------------------------------- |
| REST         | Solicitud que requiere una respuesta inmediata      |
| Eventos/cola | Procesamiento desacoplado                           |
| SSE          | Flujo de información desde el servidor al navegador |
| Webhook      | Comunicación iniciada por un sistema externo        |

Esta combinación permite evitar tanto el extremo de convertir todas las operaciones en llamadas síncronas como el de utilizar mensajería asíncrona donde una respuesta inmediata resulta necesaria.

## Consenso distribuido

Agrónoma no implementa algoritmos de consenso como Raft ni utiliza etcd para coordinar réplicas.

La infraestructura actual mantiene un único servidor MySQL por servicio, por lo que no existe un conjunto de réplicas que necesite alcanzar consenso sobre un mismo estado.

Por ello, incorporar un algoritmo de consenso aumentaría la complejidad sin resolver una necesidad presente en la arquitectura actual.

Si en una evolución futura se incorporasen múltiples réplicas con estado compartido, esta decisión tendría que volver a evaluarse.

## Ejemplo completo: lectura de un sensor

El flujo de una lectura permite observar varios de los conceptos anteriores:

1. Un dispositivo produce una nueva lectura.
2. La lectura incluye su número de secuencia.
3. La solicitud llega al sistema y es procesada por campo.
4. La combinación de dispositivo y secuencia permite identificar duplicados.
5. Campo almacena la información.
6. Se publica el evento correspondiente.
7. Alertas consume posteriormente el evento.
8. Se evalúan las reglas aplicables.
9. Si corresponde, se genera una alerta.
10. El frontend puede recibir información actualizada mediante el feed de alertas.

El flujo combina comunicación síncrona, comunicación asíncrona, idempotencia, orden lógico y comunicación orientada a flujo.
