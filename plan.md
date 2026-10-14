# Plan — Db_Mongo_Jhuly_Site

## 1. Visão geral
API Express + MongoDB do site da Jhuly (autenticação, comentários, fotos de perfil) com Swagger gerado por script (`npm run build` → `swagger.js`) e mesmo hardening aplicado ao irmão Empresa_Completo (bcrypt 72B, JWT estrito, rate limit `/health`, multipart restrito; porta Compose local 3101 preservada).

## 2. Arquitetura e tecnologias
Express/Mongoose, JWT, bcryptjs, cloudinary, Swagger doc gerada estaticamente. CI moderna.

## 3. Funcionalidades existentes
- [x] Auth/comentários/fotos — implementado.
- [x] Hardening 2026-10-11.
- [x] CI — **modernizada nesta sessão** (Ubuntu 24.04, Actions v7 SHA, Node 22/24).

## 4. Objetivos futuros
- OBJ-01 (P2, concluído nesta sessão): CI previsível.
- OBJ-02 (P3): TEST-01/02 suíte HTTP (vedada nesta esteira).
- OBJ-03 (P3): documentação Swagger validada em CI (schema lint).

## 5–9. Melhorias/Roadmap/Riscos/Ideias
- Hardening idêntico ao irmão; manter deriva zero entre os dois (registrado no ledger).

*(Gerado em 2026-10-14 pelo agente orquestrador)*
