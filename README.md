# Agrónoma DSS

Agrónoma es un **Sistema de Soporte a la Toma de Decisiones (DSS)** orientado a productores agropecuarios.

El sistema integra información productiva, telemetría de campo, condiciones meteorológicas, almacenamiento de granos y datos de mercado para facilitar el seguimiento de la explotación y apoyar decisiones comerciales.

🌐 **Aplicación:** https://agronoma.site  
🔗 **API Gateway:** https://api.agronoma.site/v1  
📚 **Documentación académica:** [`/docs`](./docs/)  
📖 **Documentación de APIs:** [`/documentacion-api`](./documentacion-api/)

## Funcionalidades principales

Agrónoma permite:

- contratar un plan de forma simulada y crear la cuenta del productor;
- incorporar empleados mediante códigos de registro asociados a un establecimiento;
- gestionar establecimientos rurales y lotes;
- administrar dispositivos y lecturas de sensores;
- registrar precipitaciones y consultar información meteorológica;
- administrar silos y movimientos de stock;
- consultar cotizaciones de soja, maíz y trigo;
- consultar el tipo de cambio;
- gestionar precios de insumos;
- calcular margen por hectárea;
- obtener un índice de oportunidad de venta;
- configurar objetivos de precio;
- generar alertas a partir de información proveniente de diferentes dominios;
- consultar alertas desde el frontend.

## Arquitectura

Agrónoma utiliza una **infraestructura distribuida** y una organización del backend basada en **microservicios por dominio**.

El frontend no accede directamente a los servicios internos.

Todas las operaciones provenientes del frontend ingresan mediante el servicio `api`, que funciona como **API Gateway**.

La arquitectura general es:

Frontend React  
↓  
API Gateway (`api`)  
↓  
`auth` · `campo` · `silos` · `mercado` · `alertas`

Cada servicio posee una responsabilidad específica y mantiene su propia persistencia cuando corresponde.

Los servicios no realizan `JOIN` sobre tablas pertenecientes a otros dominios ni utilizan las credenciales de las bases de datos de otros servicios.

Las relaciones entre dominios se mantienen mediante referencias lógicas (identificadores como `usuario_id`, `cuenta_id` o `establecimiento_id`). No existen claves foráneas entre bases de microservicios diferentes: cuando un servicio necesita información de otro, la solicita mediante endpoints internos protegidos.

## Modelo de cuenta

La unidad principal de aislamiento funcional es la **cuenta**.

Cada contratación crea un único usuario administrador (rol `admin`), una única cuenta asociada a ese administrador y un plan asociado a la cuenta. El administrador y la persona que contrata son la misma figura; no existe un "administrador principal" distinto.

Los planes definidos por el sistema son `core`, `pro` y `enterprise`, y sus límites se aplican sobre los recursos de la cuenta (estancias, lotes, sensores y empleados). Según el catálogo `planes.php` (valores configurables sin tocar código; el propio archivo los marca como provisorios hasta definir la configuración final): `core` admite 1 estancia, 5 lotes, 10 sensores y 2 empleados; `pro`, 5, 50, 100 y 10; `enterprise` no tiene límites. El administrador consulta plan, límites y uso en `GET /v1/campo/cuenta` y puede cambiar de plan de forma simulada; un plan menor se rechaza si el uso actual no cabe en él.

El modelo resultante es:

cuenta → administrador / empleados → establecimientos y recursos dependientes

- El **administrador** pertenece a una cuenta, administra sus recursos y no está limitado a un único establecimiento.
- El **empleado** pertenece a la cuenta del administrador que lo incorpora, queda asociado a un único establecimiento, conserva su rol funcional y solo opera sobre los recursos permitidos de ese establecimiento.

## Servicios

| Servicio  | Responsabilidad                                                                                                                                      |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api`     | API Gateway, autenticación de solicitudes, resolución del contexto de usuario, CORS, rate limiting, routing, circuit breaker y fachada `/v1/resumen` |
| `auth`    | Usuarios, roles, login, contratación simulada, primer ingreso, perfil, registro de empleados y tokens de acceso                                      |
| `campo`   | Cuentas, planes, establecimientos, lotes, dispositivos, lecturas, clima, códigos de registro, empleados y contexto de usuario                        |
| `silos`   | Silos, stock, mediciones y movimientos, aislados por cuenta y establecimiento, con control concurrente del stock                                     |
| `mercado` | Cotizaciones, divisas, insumos, supuestos, margen e índice de oportunidad de venta                                                                   |
| `alertas` | Procesamiento de eventos, reglas, alertas, objetivos de precio y notificaciones                                                                      |
| `front`   | Aplicación React utilizada por el usuario                                                                                                            |

## Tecnologías principales

### Backend

- PHP
- Laravel
- MySQL
- API REST
- JSON

### Frontend

- React 18
- Vite
- React Router
- Tailwind CSS
- Leaflet
- React Leaflet
- Lucide React

### Integraciones externas

- Open-Meteo para información meteorológica.
- granos.ar para cotizaciones de granos.
- DolarAPI para información del tipo de cambio.

Agrónoma no utiliza precios simulados como fuente del DSS de mercado.

## Comunicación entre componentes

El sistema combina diferentes mecanismos de comunicación.

### REST

Se utiliza para las operaciones que requieren una respuesta inmediata.

El frontend consume exclusivamente el API Gateway.

Las rutas públicas siguen la estructura:

`/v1/{servicio}/{ruta}`

Por ejemplo:

- `/v1/campo/establecimientos`
- `/v1/silos/silos/1/stock`
- `/v1/mercado/cotizaciones/ultima`
- `/v1/alertas/alertas/feed`

Las rutas `/interno/*` son APIs de coordinación entre servicios, protegidas mediante `X-Gateway-Secret`. No forman parte de la API pública y el Gateway impide su exposición.

### Eventos

Los servicios pueden publicar eventos que posteriormente son procesados por `alertas`.

Este mecanismo evita que la operación que produce un evento necesite ejecutar también toda la lógica correspondiente a las alertas.

### Server-Sent Events

El frontend puede recibir actualizaciones de alertas mediante SSE.

### Webhooks

`mercado` dispone de un webhook protegido mediante firma HMAC para comunicaciones iniciadas externamente.

## Autenticación

Las operaciones protegidas utilizan un token Bearer:

`Authorization: Bearer TOKEN`

`auth` administra la identidad y los tokens.

El API Gateway valida las solicitudes y transmite hacia los servicios únicamente la identidad obtenida durante la autenticación.

Las rutas públicas (sin token) son `POST /v1/auth/contratacion`, `POST /v1/auth/login`, `POST /v1/auth/registro` (exclusivo para empleados) y la bandeja simulada de la demo (`GET /v1/auth/correo-simulado/{token}`, cuya habilitación decide `auth`). **No existe registro público para administradores**: el rol `admin` solo se obtiene a través de una contratación y nunca mediante el registro público.

Los servicios internos no confían directamente en cabeceras de identidad enviadas por el cliente. Para `silos`, `mercado` y `alertas`, el Gateway resuelve el contexto consultando a `campo` en cada solicitud, sin caché, (`usuario_id`, `cuenta_id`, rol y, cuando corresponde, `establecimiento_id`) y lo propaga mediante cabeceras internas como `X-Usuario-Id`, `X-Cuenta-Id`, `X-Usuario-Rol` y `X-Establecimiento-Id`. Estas cabeceras son generadas por el backend y no pueden ser elegidas por el usuario desde el frontend.

### Contratación simulada y primer ingreso

La contratación es simulada porque Agrónoma es un proyecto académico: no existe integración con una pasarela de pago real.

1. La persona contrata un plan y `auth` valida la contratación.
2. `auth` crea un usuario `admin` con una contraseña temporal aleatoria, almacenada únicamente mediante hash.
3. `auth` solicita a `campo` la creación de la cuenta y recibe su identificador.
4. `auth` vincula lógicamente al administrador con esa cuenta.
5. Se genera un correo simulado con las credenciales iniciales.

Si falla la coordinación entre `auth` y `campo`, existen mecanismos de rollback/compensación para no dejar administradores o cuentas huérfanas.

El administrador nace con `primer_ingreso_pendiente = true` y el login informa ese estado. Al completar el primer ingreso (datos requeridos y nueva contraseña) la contraseña temporal deja de servir. Luego puede consultar y modificar los datos permitidos desde "Mi perfil"; rol, cuenta y estado de primer ingreso no se modifican desde el perfil.

El correo simulado no representa un servicio de email real. La bandeja demo está desactivada por defecto y se habilita en `auth` con la variable `DEMO_CORREO_SIMULADO=true`; cuando está habilitada utiliza un token aleatorio de lectura que no se conserva en texto plano.

### Registro de empleados

1. El administrador genera desde `campo` un código de registro asociado a un establecimiento de su propia cuenta.
2. El empleado se registra utilizando ese código y `auth` crea el usuario con uno de los roles de empleado permitidos.
3. `campo` valida el código y vincula al empleado con la cuenta y el establecimiento correspondientes.

El cliente no decide `cuenta_id` ni puede asignarse otro establecimiento: cuenta y establecimiento salen del código. Los roles de empleado permitidos en el registro son `productor`, `ingeniero_agronomo`, `asesor_tecnico`, `contratista` y `otro`; `admin` es rechazado.

Si `campo` falla durante el registro se hace rollback; si el resultado es incierto, se compensa en `campo` (el código vuelve a quedar activo). Los códigos pueden estar `activo`, `usado` o `revocado`.

El administrador puede consultar los empleados de su cuenta y darlos de baja de forma lógica: primero se desactiva el usuario en `auth` y luego se da de baja en `campo`, lo que libera el cupo del plan.

## Seguridad

Agrónoma aplica diferentes mecanismos de seguridad:

- HTTPS en producción;
- contraseñas almacenadas mediante hash;
- tokens almacenados mediante hash;
- autorización según cuenta, rol y establecimiento;
- aislamiento de recursos entre cuentas y validación de pertenencia;
- secreto interno (`X-Gateway-Secret`) entre Gateway y servicios;
- separación entre rutas públicas, autenticadas, administrativas e internas (`/interno/*`);
- rate limiting;
- CORS;
- firma HMAC para el webhook;
- timeouts;
- circuit breakers;
- idempotencia;
- validación de entradas.

Las credenciales y secretos de producción deben mantenerse exclusivamente en variables de entorno y no deben almacenarse en el repositorio. En producción se utiliza `APP_DEBUG=false`.

## Confiabilidad

El sistema contempla fallos parciales propios de una arquitectura distribuida.

Entre los mecanismos utilizados se encuentran:

- health checks;
- timeouts;
- circuit breakers;
- reintentos controlados;
- idempotencia;
- bloqueo de operaciones concurrentes;
- utilización del último dato meteorológico almacenado cuando falla el proveedor externo;
- respuestas controladas cuando un servicio no está disponible.

Agrónoma no implementa alta disponibilidad completa ni replicación de bases de datos.

Actualmente existe una base MySQL independiente por servicio que requiere persistencia.

## Concurrencia

El principal escenario utilizado para demostrar exclusión mutua corresponde al stock de silos.

Dos solicitudes simultáneas pueden intentar retirar grano del mismo silo.

La operación utiliza una transacción y `lockForUpdate()` para impedir que ambas solicitudes calculen la salida utilizando simultáneamente el mismo valor inicial de stock.

Las operaciones críticas también utilizan claves de idempotencia para tolerar reintentos sin duplicar efectos.

## Estructura del repositorio

La estructura principal es:

`front/`  
Frontend React.

`api/`  
API Gateway.

`auth/`  
Servicio de autenticación.

`campo/`  
Servicio de campo, sensores y clima.

`silos/`  
Servicio de almacenamiento.

`mercado/`  
Servicio DSS de mercado.

`alertas/`  
Servicio de alertas.

`documentacion-api/`  
Contratos y documentación de las APIs.

`docs/`  
Documentación organizada según los módulos de Programación Distribuida y Componentes.

## Documentación por módulos

La documentación académica se encuentra organizada en seis módulos:

| Módulo | Documentación                                                                 |
| ------ | ----------------------------------------------------------------------------- |
| 1      | [Arquitectura](./docs/modulo-1-arquitectura/)                                 |
| 2      | [Infraestructura distribuida](./docs/modulo-2-infraestructura-distribuida/)   |
| 3      | [Comunicación y sincronización](./docs/modulo-3-comunicacion-sincronizacion/) |
| 4      | [Middleware y componentes](./docs/modulo-4-middleware-componentes/)           |
| 5      | [Seguridad y confiabilidad](./docs/modulo-5-seguridad-confiabilidad/)         |
| 6      | [Patrones y escalabilidad](./docs/modulo-6-patrones-escalabilidad/)           |

Cada README explica cómo se aplicaron al sistema real los conceptos correspondientes al módulo.

## Documentación de API

Los contratos de las APIs se encuentran en:

[`documentacion-api/`](./documentacion-api/)

La documentación contiene los contratos OpenAPI (`api.json`) generados mediante Scramble para el Gateway y los servicios del backend. Estos archivos son la fuente de verdad de rutas, métodos, parámetros, cuerpos de solicitud y códigos de respuesta.

Las APIs también fueron verificadas mediante Postman durante el desarrollo y las pruebas de integración.

## Ejecución local

### Requisitos

Para ejecutar el backend localmente se necesita:

- PHP 8.2 o superior;
- Composer;
- MySQL;
- un entorno compatible con Laravel, como Laragon.

Cada servicio Laravel posee su propia configuración y, cuando corresponde, su propia base de datos.

### Puertos locales

| Proyecto  | URL                     |
| --------- | ----------------------- |
| `api`     | `http://127.0.0.1:8000` |
| `auth`    | `http://127.0.0.1:8001` |
| `campo`   | `http://127.0.0.1:8002` |
| `silos`   | `http://127.0.0.1:8003` |
| `mercado` | `http://127.0.0.1:8004` |
| `alertas` | `http://127.0.0.1:8005` |

### Configuración de los servicios

Cada servicio mantiene su propio archivo `.env`.

Como procedimiento general:

1. instalar las dependencias con Composer;
2. configurar el `.env`;
3. generar la clave de Laravel cuando corresponda;
4. crear la base MySQL correspondiente;
5. configurar las variables `DB_*`;
6. ejecutar las migraciones;
7. iniciar el servicio en su puerto correspondiente.

Las direcciones utilizadas por el Gateway para alcanzar los demás servicios se configuran mediante variables como:

- `SERVICIO_AUTH_URL`
- `SERVICIO_CAMPO_URL`
- `SERVICIO_SILOS_URL`
- `SERVICIO_MERCADO_URL`
- `SERVICIO_ALERTAS_URL`

Los valores sensibles de los archivos `.env` no deben subirse al repositorio.

### Frontend

El frontend utiliza:

`VITE_API_URL`

como única URL base del backend.

En desarrollo, esta variable debe apuntar al API Gateway.

Todas las solicitudes del frontend se construyen a partir de:

`VITE_API_URL + /v1 + ruta`

Por lo tanto, el frontend no necesita conocer las direcciones individuales utilizadas por `auth`, `campo`, `silos`, `mercado` o `alertas`.

## Despliegue

La versión productiva se encuentra desplegada utilizando subdominios independientes.

- Frontend: `agronoma.site`
- Gateway: `api.agronoma.site`
- Auth: `auth.agronoma.site`
- Campo: `campo.agronoma.site`
- Silos: `silos.agronoma.site`
- Mercado: `mercado.agronoma.site`
- Alertas: `alertas.agronoma.site`

Cada servicio mantiene su configuración productiva de manera independiente.

## Entregas y releases

El proyecto documenta su evolución mediante tags y releases de GitHub.

Cada entrega académica posee su propio tag/release, permitiendo identificar el estado del proyecto asociado a ese momento.

Las releases pueden incluir como evidencia el PDF correspondiente a cada entrega.

## Limitaciones conocidas

El alcance actual presenta algunas limitaciones asumidas explícitamente:

- la contratación de planes es simulada, sin pasarela de pago real;
- el correo inicial de contratación es simulado y no constituye un servicio de email real;
- no existe replicación de las bases de datos;
- existe una única base MySQL por servicio;
- el Gateway constituye un punto central de entrada;
- el despliegue está condicionado por cPanel compartido;
- no existe escalado horizontal dinámico en producción;
- determinados procesos asíncronos están adaptados a las restricciones del hosting.

Estas limitaciones se documentan para distinguir claramente las características implementadas de las posibles evoluciones futuras.

## Proyecto académico

Agrónoma fue desarrollado como proyecto de la materia **Programación Distribuida y Componentes**.

Integrantes:

- Constanza Baigorria
- Valentina Rosales Mercado
