-- DOCX-templates kunnen nu ook in de WYSIWYG-editor gemaakt worden. De editor levert HTML; bij het
-- opslaan wordt daar een echt .docx van gemaakt (template_data), zodat generatie en download
-- ongewijzigd blijven werken. De bron-HTML bewaren we naast het resultaat, zodat zo'n template later
-- opnieuw in de editor te openen is. Een geüploade .docx heeft geen bron-HTML (NULL) en blijft
-- dus "alleen uploaden/downloaden".

ALTER TABLE document_template ADD COLUMN source_html TEXT;
