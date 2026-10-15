package nl.puurkroatie.rds.email.service;

/**
 * Gegooid wanneer het mergen van een e-mailtemplate faalt door een fout in de
 * template zelf (bv. een onbekende/verkeerd gespelde placeholder of een
 * syntaxfout). De boodschap is bedoeld om rechtstreeks aan de template-auteur te
 * tonen; valt via de global exception handler terug op HTTP 400.
 */
public class TemplateRenderException extends RuntimeException {

    public TemplateRenderException(String message) {
        super(message);
    }
}
