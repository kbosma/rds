package nl.puurkroatie.rds.docgen.service;

import fr.opensagres.xdocreport.document.IXDocReport;
import fr.opensagres.xdocreport.template.ITemplateEngine;
import fr.opensagres.xdocreport.template.freemarker.FreemarkerTemplateEngine;
import freemarker.core.TemplateClassResolver;
import freemarker.template.Configuration;

/**
 * Schermt de FreeMarker-engine van xdocreport af voor het genereren van documenten.
 *
 * De .docx-templates worden door gebruikers geüpload (TEMPLATE_CREATE) en zijn dus
 * NIET-VERTROUWD. FreeMarker staat standaard toe dat een template met de ?new-built-in
 * elke TemplateModel-klasse aanmaakt, waaronder freemarker.template.utility.Execute
 * (commando's uitvoeren op de server). Eén regel tekst in een .docx volstaat dan:
 * {@code ${"freemarker.template.utility.Execute"?new()("id")}}.
 *
 * Dit zet ?new en ?api dicht. Slaagt dat niet, dan wordt de generatie geweigerd in plaats
 * van onbeveiligd uit te voeren.
 */
public final class FreemarkerHardening {

    private FreemarkerHardening() {
    }

    public static void harden(IXDocReport report) {
        ITemplateEngine engine = report.getTemplateEngine();
        if (!(engine instanceof FreemarkerTemplateEngine freemarkerEngine)) {
            throw new IllegalStateException("Unexpected template engine, refusing to generate the document: "
                    + (engine == null ? "none" : engine.getClass().getName()));
        }
        Configuration configuration = freemarkerEngine.getFreemarkerConfiguration();
        if (configuration == null) {
            throw new IllegalStateException("FreeMarker configuration unavailable, refusing to generate the document.");
        }
        configuration.setNewBuiltinClassResolver(TemplateClassResolver.ALLOWS_NOTHING_RESOLVER);
        configuration.setAPIBuiltinEnabled(false);
    }
}
