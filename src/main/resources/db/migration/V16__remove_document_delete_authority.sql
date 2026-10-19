-- Een document wordt nooit verwijderd (ontwerpbesluit: documenten en betalingen zijn de geschiedenis).
-- Het endpoint DELETE /api/documents/{id} is vervallen; daarmee heeft de authority DOCUMENT_DELETE geen functie meer.
-- Eerst de koppelingen aan de rollen (MANAGER en EMPLOYEE), daarna de authority zelf.
DELETE FROM role_authority WHERE authority_id = 'd1000000-0000-0000-0000-000000000060';
DELETE FROM authority WHERE authority_id = 'd1000000-0000-0000-0000-000000000060';
