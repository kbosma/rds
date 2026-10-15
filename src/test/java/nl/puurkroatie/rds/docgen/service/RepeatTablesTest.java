package nl.puurkroatie.rds.docgen.service;

import nl.puurkroatie.rds.docgen.service.RepeatTables.InvalidRepeatException;
import nl.puurkroatie.rds.docgen.service.RepeatTables.Repeat;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Element;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Herhaalde tabellen: de laatste rij wordt per lijstelement herhaald; HTML zonder
 * herhaling blijft onaangeroerd; lijst- en itemnaam komen van een gebruiker en worden strikt gevalideerd.
 */
class RepeatTablesTest {

    private static Element table(String attributes) {
        return Jsoup.parseBodyFragment("<table " + attributes + "><tbody><tr><th>Naam</th></tr>"
                + "<tr><td>${t.firstname}</td></tr></tbody></table>").selectFirst("table");
    }

    // ----- of(): wat herhaalt een tabel? -----

    @Test
    void of_plainTable_isNotRepeated() {
        assertTrue(RepeatTables.of(table("")).isEmpty());
    }

    @Test
    void of_readsListAndItem() {
        Repeat repeat = RepeatTables.of(table("data-repeat=\"booking.travelers\" data-item=\"t\"")).orElseThrow();

        assertEquals("booking.travelers", repeat.list());
        assertEquals("t", repeat.item());
    }

    @Test
    void of_withoutItem_usesTheDefaultName() {
        assertEquals("item", RepeatTables.of(table("data-repeat=\"booking.travelers\"")).orElseThrow().item());
    }

    @Test
    void of_trimsWhitespace() {
        Repeat repeat = RepeatTables.of(table("data-repeat=\"  booking.travelers \" data-item=\" t \"")).orElseThrow();

        assertEquals("booking.travelers", repeat.list());
        assertEquals("t", repeat.item());
    }

    @Test
    void of_acceptsADeepPath() {
        assertEquals("line.supplier.addresses",
                RepeatTables.of(table("data-repeat=\"line.supplier.addresses\"")).orElseThrow().list());
    }

    @Test
    void of_rejectsAListThatIsNotAPathOfIdentifiers() {
        for (String bad : new String[]{
                "booking.travelers as x><#assign y=1><#list booking.travelers",
                "booking.travelers()",
                "booking['travelers']",
                "booking..travelers",
                ".booking",
                "1booking",
                "",
                "a b"}) {
            assertThrows(InvalidRepeatException.class,
                    () -> RepeatTables.of(table("data-repeat=\"" + bad.replace("\"", "&quot;") + "\"")),
                    "moet geweigerd worden: '" + bad + "'");
        }
    }

    @Test
    void of_rejectsAnItemNameThatIsNotAnIdentifier() {
        for (String bad : new String[]{"t>", "t as", "t.x", "1t", "t-1", "t;"}) {
            assertThrows(InvalidRepeatException.class,
                    () -> RepeatTables.of(table("data-repeat=\"booking.travelers\" data-item=\"" + bad + "\"")),
                    "moet geweigerd worden: '" + bad + "'");
        }
    }

    // ----- repeatingRow(): de laatste rij -----

    @Test
    void repeatingRow_isTheLastRow() {
        Element row = RepeatTables.repeatingRow(table("data-repeat=\"booking.travelers\"")).orElseThrow();

        assertEquals("${t.firstname}", row.text());
    }

    @Test
    void repeatingRow_ofATableWithoutRows_isEmpty() {
        Element empty = Jsoup.parseBodyFragment("<table data-repeat=\"a.b\"></table>").selectFirst("table");

        assertTrue(RepeatTables.repeatingRow(empty).isEmpty());
    }

    // ----- toFreemarker() -----

    @Test
    void toFreemarker_withoutRepeatedTable_returnsTheSameStringUntouched() {
        String html = "<p>Hoi <b>${prospect.firstname}</b></p><table><tr><td>x</td></tr></table>";

        assertSame(html, RepeatTables.toFreemarker(html));
    }

    @Test
    void toFreemarker_nullAndEmpty_arePassedThrough() {
        assertNull(RepeatTables.toFreemarker(null));
        assertEquals("", RepeatTables.toFreemarker(""));
    }

    @Test
    void toFreemarker_wrapsOnlyTheLastRowInAList() {
        String html = "<table data-repeat=\"booking.travelers\" data-item=\"t\"><tbody>"
                + "<tr><th>Naam</th></tr><tr><td>${t.firstname}</td></tr></tbody></table>";

        assertEquals("<table><tbody><tr><th>Naam</th></tr>"
                + "<#list booking.travelers as t><tr><td>${t.firstname}</td></tr></#list></tbody></table>",
                RepeatTables.toFreemarker(html));
    }

    @Test
    void toFreemarker_removesTheEditorAttributes() {
        String out = RepeatTables.toFreemarker(
                "<table data-repeat=\"a.b\" data-item=\"x\" class=\"keep\"><tbody><tr><td>${x}</td></tr></tbody></table>");

        assertFalse(out.contains("data-repeat"), out);
        assertFalse(out.contains("data-item"), out);
        assertTrue(out.contains("class=\"keep\""), out);
    }

    @Test
    void toFreemarker_handlesSeveralTables_eachWithItsOwnList() {
        String html = "<table data-repeat=\"booking.travelers\" data-item=\"t\"><tbody><tr><td>${t.firstname}</td></tr></tbody></table>"
                + "<p>tussen</p>"
                + "<table data-repeat=\"booking.bookingLines\" data-item=\"l\"><tbody><tr><td>${l.name}</td></tr></tbody></table>";

        String out = RepeatTables.toFreemarker(html);

        assertTrue(out.contains("<#list booking.travelers as t><tr><td>${t.firstname}</td></tr></#list>"), out);
        assertTrue(out.contains("<#list booking.bookingLines as l><tr><td>${l.name}</td></tr></#list>"), out);
        assertTrue(out.contains("<p>tussen</p>"), out);
    }

    @Test
    void toFreemarker_usesTheDefaultItemName() {
        String out = RepeatTables.toFreemarker(
                "<table data-repeat=\"booking.travelers\"><tbody><tr><td>${item.firstname}</td></tr></tbody></table>");

        assertTrue(out.contains("<#list booking.travelers as item>"), out);
    }

    @Test
    void toFreemarker_doesNotEscapeFreemarkerExpressionsInTheCells() {
        String out = RepeatTables.toFreemarker(
                "<table data-repeat=\"a.b\" data-item=\"x\"><tbody><tr><td>${x.name!\"-\"}</td></tr></tbody></table>");

        assertTrue(out.contains("${x.name!\"-\"}"), out);
    }

    @Test
    void toFreemarker_rejectsAnInjectedDirective() {
        String html = "<table data-repeat=\"a.b as x><#assign y=1><#list a.b\" data-item=\"t\"><tbody>"
                + "<tr><td>x</td></tr></tbody></table>";

        assertThrows(InvalidRepeatException.class, () -> RepeatTables.toFreemarker(html));
    }

    @Test
    void toFreemarker_aTableWithoutRowsIsLeftWithoutDirectives() {
        String out = RepeatTables.toFreemarker("<table data-repeat=\"a.b\"></table><p>x</p>");

        assertFalse(out.contains("#list"), out);
    }
}
