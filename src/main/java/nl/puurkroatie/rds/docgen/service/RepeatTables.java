package nl.puurkroatie.rds.docgen.service;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.nodes.Entities;
import org.jsoup.nodes.TextNode;
import org.jsoup.select.Elements;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * "Herhaalde tabellen" in template-HTML: een {@code <table data-repeat="booking.travelers" data-item="t">}
 * waarvan de LAATSTE rij voor elk element van de lijst wordt herhaald (rijen erboven, zoals een
 * kopregel, blijven staan).
 *
 * Eén concept voor twee uitvoeren, zodat de editor het maar één keer hoeft te kennen:
 * <ul>
 *   <li>e-mail: omgezet naar FreeMarker {@code <#list ...>} rond die rij ({@link #toFreemarker});</li>
 *   <li>.docx: omgezet naar Word-samenvoegvelden {@code @before-row}/{@code @after-row} (zie
 *       HtmlToDocxConverter, dat {@link #of(Element)} gebruikt).</li>
 * </ul>
 *
 * Lijstnaam en itemnaam komen van een gebruiker en komen in een FreeMarker-directive terecht; ze
 * worden daarom strikt gevalideerd (alleen een pad van identifiers), anders wordt het geweigerd.
 */
public final class RepeatTables {

    /** Een pad van identifiers, bv. {@code booking.travelers} of {@code line.supplier.addresses}. */
    private static final Pattern LIST_EXPRESSION = Pattern.compile("[A-Za-z_][A-Za-z0-9_]*(\\.[A-Za-z_][A-Za-z0-9_]*)*");
    private static final Pattern ITEM_NAME = Pattern.compile("[A-Za-z_][A-Za-z0-9_]*");

    private static final String START_MARKER = "[[RDS_LIST_START_";
    private static final String END_MARKER = "[[RDS_LIST_END_";

    private RepeatTables() {
    }

    /** Wat een herhaalde tabel herhaalt: de lijst en de naam waaronder elk element in de rij beschikbaar is. */
    public record Repeat(String list, String item) {
    }

    /** Ongeldige lijst- of itemnaam (mogelijk een poging om iets in de directive te smokkelen). */
    public static class InvalidRepeatException extends RuntimeException {
        public InvalidRepeatException(String message) {
            super(message);
        }
    }

    /** De herhaling van deze tabel, of leeg als het een gewone tabel is. */
    public static Optional<Repeat> of(Element table) {
        if (!table.hasAttr("data-repeat")) {
            return Optional.empty();
        }
        String list = table.attr("data-repeat").trim();
        String item = table.hasAttr("data-item") ? table.attr("data-item").trim() : "item";
        if (!LIST_EXPRESSION.matcher(list).matches()) {
            throw new InvalidRepeatException("Invalid list in a repeated table: '" + list + "'.");
        }
        if (!ITEM_NAME.matcher(item).matches()) {
            throw new InvalidRepeatException("Invalid item name in a repeated table: '" + item + "'.");
        }
        return Optional.of(new Repeat(list, item));
    }

    /** De rij die herhaald wordt: de laatste rij van de tabel. */
    public static Optional<Element> repeatingRow(Element table) {
        Elements rows = table.select("tr");
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.last());
    }

    /**
     * Zet herhaalde tabellen om naar FreeMarker: rond de herhalende rij komt {@code <#list lijst as item>}
     * en {@code </#list>}. HTML zonder herhaalde tabel blijft byte-voor-byte ongewijzigd (er wordt dan niet
     * eens geparsed), zodat bestaande templates niet worden aangeraakt.
     */
    public static String toFreemarker(String html) {
        if (html == null || !html.contains("data-repeat")) {
            return html;
        }
        Document doc = Jsoup.parseBodyFragment(html);
        doc.outputSettings().prettyPrint(false).escapeMode(Entities.EscapeMode.xhtml);

        List<String[]> directives = new ArrayList<>();
        for (Element table : doc.select("table[data-repeat]")) {
            Optional<Repeat> repeat = of(table);
            Optional<Element> row = repeatingRow(table);
            if (repeat.isEmpty() || row.isEmpty()) {
                continue;
            }
            int n = directives.size();
            directives.add(new String[]{"<#list " + repeat.get().list() + " as " + repeat.get().item() + ">", "</#list>"});
            // Een marker i.p.v. de directive zelf: de HTML-serializer zou '<#' als tekst escapen.
            row.get().before(new TextNode(START_MARKER + n + "]]"));
            row.get().after(new TextNode(END_MARKER + n + "]]"));
            // De attributen zijn een editor-detail, geen onderdeel van de uiteindelijke mail.
            table.removeAttr("data-repeat").removeAttr("data-item");
        }

        String out = doc.body().html();
        for (int i = 0; i < directives.size(); i++) {
            out = out.replace(START_MARKER + i + "]]", directives.get(i)[0])
                     .replace(END_MARKER + i + "]]", directives.get(i)[1]);
        }
        return out;
    }
}
