# Architecture

## Backend (Spring Boot)

- Gelaagde architectuur:
    - controller
    - service
    - repository

- Services:
    - bevatten business logica
    - zijn transactioneel
    - valideren input

- Repositories:
    - Spring Data JPA (JpaRepository)
    - paginering waar nodig

---

## Frontend (Angular)

- Angular 19 standalone components
- RxJS + async pipe
- Services voor API communicatie
- Reactive forms

Structuur:
- components/
- services/
- models/

---

## REST API

- GET /api/users
- GET /api/users/{id}
- POST /api/users
- PUT /api/users/{id}
- DELETE /api/users/{id}

Statuscodes:
- 200, 201, 204, 400, 404

---

## Database (PostgreSQL)

- snake_case in DB, camelCase in Java
- constraints: NOT NULL, UNIQUE
- indexing waar nodig

---

## DTO & Mapping

- DTO’s voor alle communicatie
- MapStruct aanbevolen
- geen entities exposen
