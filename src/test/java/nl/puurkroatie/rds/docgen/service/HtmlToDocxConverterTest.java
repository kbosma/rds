package nl.puurkroatie.rds.docgen.service;

import fr.opensagres.xdocreport.document.IXDocReport;
import fr.opensagres.xdocreport.converter.ConverterTypeTo;
import fr.opensagres.xdocreport.converter.ConverterTypeVia;
import fr.opensagres.xdocreport.converter.Options;
import fr.opensagres.xdocreport.document.registry.XDocReportRegistry;
import fr.opensagres.xdocreport.template.IContext;
import fr.opensagres.xdocreport.template.TemplateEngineKind;
import nl.puurkroatie.rds.docgen.context.BookerContext;
import nl.puurkroatie.rds.docgen.context.BookingContext;
import nl.puurkroatie.rds.docgen.context.TravelerContext;
import nl.puurkroatie.rds.docgen.service.HtmlToDocxConverter.DocxConversionException;
import nl.puurkroatie.rds.docgen.service.HtmlToDocxConverter.Image;
import nl.puurkroatie.rds.docgen.service.HtmlToDocxConverter.ImageLookup;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.UnderlinePatterns;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFHyperlinkRun;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.apache.poi.xwpf.usermodel.XWPFTable;
import org.junit.jupiter.api.Test;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * HTML uit de editor wordt een echt .docx. De belangrijkste test is steeds de hele keten: dat .docx gaat
 * door dezelfde (afgeschermde) xdocreport/FreeMarker-straat als een geüpload bestand, en de samengevoegde
 * tekst wordt vergeleken.
 */
class HtmlToDocxConverterTest {

    private static final UUID IMAGE_ID = UUID.fromString("aaaaaaaa-1111-2222-3333-444444444444");
    private static final String IMAGE_SRC = "/api/public/email-images/" + IMAGE_ID;

    private final HtmlToDocxConverter converter = new HtmlToDocxConverter();

    // ----- hulpmiddelen -----

    private static final ImageLookup NO_IMAGES = id -> Optional.empty();

    private byte[] convert(String html) {
        return converter.convert(html, NO_IMAGES);
    }

    private static XWPFDocument open(byte[] docx) throws Exception {
        return new XWPFDocument(new ByteArrayInputStream(docx));
    }

    private static String text(byte[] docx) throws Exception {
        try (XWPFDocument doc = open(docx); XWPFWordExtractor extractor = new XWPFWordExtractor(doc)) {
            return extractor.getText().trim();
        }
    }

    private static BookingContext booking(TravelerContext... travelers) {
        BookerContext booker = new BookerContext("Jan", "de", "Vries", "cs", "06", "jan@x.nl",
                "MAN", LocalDate.of(1990, 5, 17), "J.", List.of());
        return new BookingContext("B-2026-0042", "BOEKING", LocalDate.of(2026, 6, 1), LocalDate.of(2026, 6, 8),
                new BigDecimal("1250.00"), booker, List.of(travelers), List.of(), List.of());
    }

    /** Zoals DocumentGenerationServiceImpl: laden, afschermen, samenvoegen; levert de tekst van het resultaat. */
    private static String merge(byte[] docx, BookingContext booking) throws Exception {
        IXDocReport report = XDocReportRegistry.getRegistry().loadReport(
                new ByteArrayInputStream(docx), TemplateEngineKind.Freemarker);
        FreemarkerHardening.harden(report);
        IContext context = report.createContext();
        context.put("booking", TemplateModels.toModel(booking));
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        report.process(context, out);
        // Na elke tabel staat een lege alinea (anders plakt Word tabellen aan elkaar); die tellen we niet mee.
        return text(out.toByteArray()).replaceAll("\n{2,}", "\n");
    }

    private static byte[] png(int width, int height) throws Exception {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, "png", out);
        return out.toByteArray();
    }

    private static ImageLookup library(String contentType, byte[] data) {
        return id -> id.equals(IMAGE_ID) ? Optional.of(new Image(data, contentType)) : Optional.empty();
    }

    // ----- inhoud en samenvoegen -----

    @Test
    void text_andMergeFields_areMergedLikeAnUploadedTemplate() throws Exception {
        byte[] docx = convert("<p>Boeking ${booking.bookingNumber} voor ${booking.booker.firstname}</p>");

        assertEquals("Boeking B-2026-0042 voor Jan", merge(docx, booking()));
    }

    @Test
    void mergeFieldsInHeadingsAndListsAndCells_areMerged() throws Exception {
        byte[] docx = convert("<h1>Offerte ${booking.bookingNumber}</h1>"
                + "<ul><li><p>Hoofdboeker ${booking.booker.lastname}</p></li></ul>"
                + "<table><tbody><tr><td>Totaal</td><td>${booking.bookingStatus}</td></tr></tbody></table>");

        String merged = merge(docx, booking());

        assertTrue(merged.contains("Offerte B-2026-0042"), merged);
        assertTrue(merged.contains("Hoofdboeker Vries"), merged);
        assertTrue(merged.contains("Totaal\tBOEKING"), merged);
    }

    @Test
    void aMoneyAmountWithAFormat_alwaysHasTwoDecimals() throws Exception {
        // Dit is wat de editor voor "Totaalbedrag" invoegt; zonder opmaak toont FreeMarker 1250.00 als "1.250".
        String merged = merge(convert("<p>${booking.totalSum?string(\"#,##0.00\")}</p>"), booking());

        assertTrue(merged.matches("1[.,]250[.,]00"), merged);
    }

    @Test
    void doubleQuotesInAnExpression_work() throws Exception {
        // Let op: een enkele aanhalingsteken (') in een Word-template geeft een syntaxfout bij het samenvoegen
        // (xdocreport schrijft hem als &apos; in de XML); daarom gebruikt de editor overal dubbele.
        assertEquals("Boeking B-2026-0042 of -",
                merge(convert("<p>Boeking ${booking.bookingNumber!\"-\"} of ${booking.unknown!\"-\"}</p>"), booking()));
    }

    @Test
    void ampersandsAndAngleBracketsInPlainText_stayEscaped() throws Exception {
        try (XWPFDocument doc = open(convert("<p>a &amp; b &lt; c &gt; d</p>"))) {
            assertEquals("a & b < c > d", doc.getParagraphs().get(0).getText());
        }
    }

    @Test
    void specialCharactersInTheText_surviveAsPlainText() throws Exception {
        String merged = merge(convert("<p>a &amp; b &lt; c &gt; d \"e\" 'f' é ü €</p>"), booking());

        assertEquals("a & b < c > d \"e\" 'f' é ü €", merged);
    }

    @Test
    void whitespaceInsideAParagraph_isCollapsedLikeInABrowser() throws Exception {
        assertEquals("een twee drie", text(convert("<p>een   twee\n   drie</p>")));
    }

    @Test
    void aHardBreak_becomesALineBreak() throws Exception {
        assertEquals("regel 1\nregel 2", text(convert("<p>regel 1<br>regel 2</p>")));
    }

    @Test
    void emptyParagraphs_arePreserved_butTheTrailingBreakIsNotAnExtraLine() throws Exception {
        try (XWPFDocument doc = open(convert("<p>a</p><p></p><p><br class=\"ProseMirror-trailingBreak\"></p><p>b</p>"))) {
            assertEquals(4, doc.getParagraphs().size());
            assertEquals("", doc.getParagraphs().get(2).getText());
            assertTrue(doc.getParagraphs().get(2).getRuns().isEmpty(), "geen extra regeleinde in een lege alinea");
        }
    }

    @Test
    void nullAndEmptyHtml_giveAValidDocumentWithOneParagraph() throws Exception {
        for (String html : new String[]{null, "", "   "}) {
            try (XWPFDocument doc = open(convert(html))) {
                assertEquals(1, doc.getParagraphs().size(), "html=" + html);
            }
        }
    }

    // ----- opmaak -----

    @Test
    void inlineFormatting_isCarriedOver() throws Exception {
        try (XWPFDocument doc = open(convert(
                "<p><strong>vet</strong><em>cursief</em><u>onder</u><s>door</s></p>"))) {
            List<XWPFRun> runs = doc.getParagraphs().get(0).getRuns();
            assertTrue(runs.get(0).isBold());
            assertTrue(runs.get(1).isItalic());
            assertEquals(UnderlinePatterns.SINGLE, runs.get(2).getUnderline());
            assertTrue(runs.get(3).isStrikeThrough());
            assertFalse(runs.get(1).isBold());
        }
    }

    @Test
    void nestedFormatting_combines() throws Exception {
        try (XWPFDocument doc = open(convert("<p><strong><em>beide</em></strong></p>"))) {
            XWPFRun run = doc.getParagraphs().get(0).getRuns().get(0);
            assertTrue(run.isBold());
            assertTrue(run.isItalic());
        }
    }

    @Test
    void fontFamilySizeAndColor_comeFromTheSpanStyle() throws Exception {
        try (XWPFDocument doc = open(convert(
                "<p><span style=\"font-family: Georgia, serif; font-size: 16px; color: #ff0000\">groot</span></p>"))) {
            XWPFRun run = doc.getParagraphs().get(0).getRuns().get(0);
            assertEquals("Georgia", run.getFontFamily());
            assertEquals(12.0, run.getFontSizeAsDouble(), 0.01); // 16px = 12pt
            assertEquals("FF0000", run.getColor());
        }
    }

    @Test
    void rgbAndShortHexColors_areUnderstood() {
        assertEquals("FF0000", HtmlToDocxConverter.colorHex("rgb(255, 0, 0)"));
        assertEquals("00FF00", HtmlToDocxConverter.colorHex("#0f0"));
        assertEquals("0A0B0C", HtmlToDocxConverter.colorHex("#0a0b0c"));
        assertNull(HtmlToDocxConverter.colorHex("red"));
        assertNull(HtmlToDocxConverter.colorHex("rgb(999, 0, 0)"));
        assertNull(HtmlToDocxConverter.colorHex("url(javascript:alert(1))"));
    }

    @Test
    void anOddFontFamily_isIgnored_insteadOfWrittenIntoTheDocument() throws Exception {
        try (XWPFDocument doc = open(convert(
                "<p><span style=\"font-family: '&lt;script&gt;x'\">tekst</span></p>"))) {
            assertEquals("Calibri", doc.getParagraphs().get(0).getRuns().get(0).getFontFamily());
        }
    }

    @Test
    void headings_areBoldAndLargerThanBodyText() throws Exception {
        try (XWPFDocument doc = open(convert("<h1>Titel</h1><h3>Kop</h3><p>tekst</p>"))) {
            XWPFRun h1 = doc.getParagraphs().get(0).getRuns().get(0);
            XWPFRun h3 = doc.getParagraphs().get(1).getRuns().get(0);
            XWPFRun body = doc.getParagraphs().get(2).getRuns().get(0);
            assertTrue(h1.isBold());
            assertEquals(20.0, h1.getFontSizeAsDouble(), 0.01);
            assertEquals(14.0, h3.getFontSizeAsDouble(), 0.01);
            assertEquals(11.0, body.getFontSizeAsDouble(), 0.01);
            assertFalse(body.isBold());
        }
    }

    @Test
    void textAlignment_isCarriedOver() throws Exception {
        try (XWPFDocument doc = open(convert("<p style=\"text-align: center\">midden</p><p>links</p>"))) {
            assertEquals(org.apache.poi.xwpf.usermodel.ParagraphAlignment.CENTER, doc.getParagraphs().get(0).getAlignment());
            assertNull(doc.getParagraphs().get(1).getCTP().getPPr().getJc());
        }
    }

    @Test
    void preformattedText_keepsItsLineBreaksInAMonospaceFont() throws Exception {
        try (XWPFDocument doc = open(convert("<pre><code>a\nb</code></pre>"))) {
            XWPFParagraph p = doc.getParagraphs().get(0);
            assertEquals("a\nb", p.getText());
            assertEquals("Courier New", p.getRuns().get(0).getFontFamily());
        }
    }

    @Test
    void aHorizontalRule_isAParagraphWithABottomBorder() throws Exception {
        try (XWPFDocument doc = open(convert("<p>a</p><hr><p>b</p>"))) {
            assertEquals(3, doc.getParagraphs().size());
            assertNotNull(doc.getParagraphs().get(1).getCTP().getPPr().getPBdr());
        }
    }

    @Test
    void aBlockquote_isIndented() throws Exception {
        try (XWPFDocument doc = open(convert("<blockquote><p>citaat</p></blockquote>"))) {
            assertEquals(720, doc.getParagraphs().get(0).getIndentationLeft());
            assertTrue(doc.getParagraphs().get(0).getRuns().get(0).isItalic());
        }
    }

    @Test
    void thePage_isA4WithMargins() throws Exception {
        try (XWPFDocument doc = open(convert("<p>x</p>"))) {
            var section = doc.getDocument().getBody().getSectPr();
            assertEquals(11906, ((Number) section.getPgSz().getW()).intValue());
            assertEquals(16838, ((Number) section.getPgSz().getH()).intValue());
            assertEquals(1417, ((Number) section.getPgMar().getLeft()).intValue());
        }
    }

    @Test
    void unknownElements_keepTheirContent_andScriptsAreDropped() throws Exception {
        String html = "<div><custom-tag>binnen</custom-tag></div><script>alert(1)</script><style>p{}</style>"
                + "<p>na<iframe src=\"http://x\"></iframe></p>";

        assertEquals("binnen\nna", text(convert(html)));
    }

    // ----- links -----

    @Test
    void aLink_becomesAHyperlinkRun() throws Exception {
        try (XWPFDocument doc = open(convert("<p><a href=\"https://puurkroatie.nl/info\">klik</a></p>"))) {
            XWPFRun run = doc.getParagraphs().get(0).getRuns().get(0);
            assertTrue(run instanceof XWPFHyperlinkRun);
            assertEquals("https://puurkroatie.nl/info",
                    ((XWPFHyperlinkRun) run).getHyperlink(doc).getURL());
            assertEquals("klik", run.text());
        }
    }

    @Test
    void aLinkWithADangerousOrRelativeScheme_isJustText() throws Exception {
        for (String href : new String[]{"javascript:alert(1)", "data:text/html,x", "file:///etc/passwd", "/relatief", "", "vbscript:x"}) {
            try (XWPFDocument doc = open(convert("<p><a href=\"" + href + "\">tekst</a></p>"))) {
                XWPFRun run = doc.getParagraphs().get(0).getRuns().get(0);
                assertFalse(run instanceof XWPFHyperlinkRun, "href=" + href);
                assertEquals("tekst", run.text());
            }
        }
    }

    // ----- lijsten -----

    @Test
    void bulletList_isNumberedWithBullets_andNestedItemsGetADeeperLevel() throws Exception {
        try (XWPFDocument doc = open(convert(
                "<ul><li><p>een</p><ul><li><p>binnen</p></li></ul></li><li><p>twee</p></li></ul>"))) {
            List<XWPFParagraph> ps = doc.getParagraphs();
            assertEquals("een", ps.get(0).getText());
            assertEquals("binnen", ps.get(1).getText());
            assertEquals("twee", ps.get(2).getText());
            assertNotNull(ps.get(0).getNumID());
            assertEquals(0, ps.get(0).getNumIlvl().intValue());
            assertEquals(1, ps.get(1).getNumIlvl().intValue());
            assertEquals(0, ps.get(2).getNumIlvl().intValue());
            assertEquals(ps.get(0).getNumID(), ps.get(2).getNumID());
            assertEquals("•", doc.getNumbering().getAbstractNum(
                    doc.getNumbering().getNum(ps.get(0).getNumID()).getCTNum().getAbstractNumId().getVal())
                    .getCTAbstractNum().getLvlArray(0).getLvlText().getVal());
        }
    }

    @Test
    void everyOrderedListRestartsAtOne() throws Exception {
        try (XWPFDocument doc = open(convert("<ol><li><p>a</p></li></ol><p>tussen</p><ol><li><p>b</p></li></ol>"))) {
            var first = doc.getParagraphs().get(0).getNumID();
            var second = doc.getParagraphs().get(2).getNumID();
            assertNotEquals(first, second, "elke genummerde lijst heeft een eigen nummering");

            var override = doc.getNumbering().getNum(second).getCTNum().getLvlOverrideArray(0);
            assertEquals(1, override.getStartOverride().getVal().intValue());
        }
    }

    @Test
    void aSecondParagraphInAListItem_isIndentedWithoutANumber() throws Exception {
        try (XWPFDocument doc = open(convert("<ol><li><p>een</p><p>vervolg</p></li></ol>"))) {
            assertNotNull(doc.getParagraphs().get(0).getNumID());
            assertNull(doc.getParagraphs().get(1).getNumID());
            assertEquals(720, doc.getParagraphs().get(1).getIndentationLeft());
        }
    }

    @Test
    void aListItemWithLooseText_isAlsoAnItem() throws Exception {
        try (XWPFDocument doc = open(convert("<ul><li>los</li><li><strong>vet</strong> en normaal</li></ul>"))) {
            assertEquals("los", doc.getParagraphs().get(0).getText());
            assertNotNull(doc.getParagraphs().get(0).getNumID());
            assertEquals("vet en normaal", doc.getParagraphs().get(1).getText());
        }
    }

    @Test
    void theNumberingIsValidWhenTheDocumentIsReadAgainAndMerged() throws Exception {
        byte[] docx = convert("<ul><li><p>${booking.bookingNumber}</p></li></ul><ol><li><p>x</p></li></ol>");

        assertEquals("B-2026-0042\nx", merge(docx, booking()));
    }

    // ----- tabellen -----

    private static XWPFTable onlyTable(XWPFDocument doc) {
        assertEquals(1, doc.getTables().size());
        return doc.getTables().get(0);
    }

    @Test
    void aTable_hasItsRowsAndCells_andAParagraphAfterIt() throws Exception {
        try (XWPFDocument doc = open(convert(
                "<table><tbody><tr><th>Naam</th><th>Plaats</th></tr><tr><td>Jan</td><td>Zagreb</td></tr></tbody></table><p>na</p>"))) {
            XWPFTable table = onlyTable(doc);
            assertEquals(2, table.getNumberOfRows());
            assertEquals(2, table.getRow(0).getTableCells().size());
            assertEquals("Jan", table.getRow(1).getCell(0).getText());
            assertEquals("Zagreb", table.getRow(1).getCell(1).getText());
            assertTrue(doc.getParagraphs().size() >= 1);
            assertEquals("na", doc.getParagraphs().get(doc.getParagraphs().size() - 1).getText());
        }
    }

    @Test
    void aHeaderRow_isShadedBoldAndRepeatsOnEveryPage() throws Exception {
        try (XWPFDocument doc = open(convert(
                "<table><tbody><tr><th>Naam</th></tr><tr><td>Jan</td></tr></tbody></table>"))) {
            XWPFTable table = onlyTable(doc);
            assertEquals("F0F0F0", table.getRow(0).getCell(0).getCTTc().getTcPr().getShd().xgetFill().getStringValue());
            assertTrue(table.getRow(0).getCell(0).getParagraphs().get(0).getRuns().get(0).isBold());
            assertTrue(table.getRow(0).isRepeatHeader());
            assertFalse(table.getRow(1).isRepeatHeader());
            assertFalse(table.getRow(1).getCell(0).getParagraphs().get(0).getRuns().get(0).isBold());
        }
    }

    @Test
    void aTable_hasBordersAndFullWidth() throws Exception {
        try (XWPFDocument doc = open(convert("<table><tbody><tr><td>x</td></tr></tbody></table>"))) {
            var properties = onlyTable(doc).getCTTbl().getTblPr();
            assertEquals(5000, ((Number) properties.getTblW().getW()).intValue());
            assertEquals("CCCCCC", properties.getTblBorders().getInsideH().xgetColor().getStringValue());
        }
    }

    @Test
    void colspan_becomesGridSpan() throws Exception {
        try (XWPFDocument doc = open(convert(
                "<table><tbody><tr><td colspan=\"2\">breed</td></tr><tr><td>a</td><td>b</td></tr></tbody></table>"))) {
            XWPFTable table = onlyTable(doc);
            assertEquals(1, table.getRow(0).getTableCells().size());
            assertEquals(2, table.getRow(0).getCell(0).getCTTc().getTcPr().getGridSpan().getVal().intValue());
            assertEquals(2, table.getRow(1).getTableCells().size());
        }
    }

    @Test
    void rowspan_becomesAVerticalMerge() throws Exception {
        try (XWPFDocument doc = open(convert(
                "<table><tbody><tr><td rowspan=\"2\">hoog</td><td>a</td></tr><tr><td>b</td></tr></tbody></table>"))) {
            XWPFTable table = onlyTable(doc);
            assertEquals(2, table.getRow(0).getTableCells().size());
            assertEquals(2, table.getRow(1).getTableCells().size(), "de samengevoegde cel blijft als voortzetting staan");
            assertEquals(org.openxmlformats.schemas.wordprocessingml.x2006.main.STMerge.RESTART,
                    table.getRow(0).getCell(0).getCTTc().getTcPr().getVMerge().getVal());
            assertNull(table.getRow(1).getCell(0).getCTTc().getTcPr().getVMerge().getVal());
            assertEquals("b", table.getRow(1).getCell(1).getText());
        }
    }

    @Test
    void aSavedColumnWidth_isUsed() throws Exception {
        try (XWPFDocument doc = open(convert(
                "<table><tbody><tr><td colwidth=\"200\">a</td><td>b</td></tr></tbody></table>"))) {
            var width = onlyTable(doc).getRow(0).getCell(0).getCTTc().getTcPr().getTcW();
            assertEquals(3000, ((Number) width.getW()).intValue()); // 200px * 15 twips
        }
    }

    @Test
    void theTableGrid_hasOneColumnPerGridPosition_andFillsTheTextWidth() throws Exception {
        try (XWPFDocument doc = open(convert(
                "<table><tbody><tr><td colspan=\"2\">breed</td><td>c</td></tr><tr><td>a</td><td>b</td><td>c</td></tr></tbody></table>"))) {
            var grid = onlyTable(doc).getCTTbl().getTblGrid();
            assertEquals(3, grid.sizeOfGridColArray());
            int total = 0;
            for (var column : grid.getGridColList()) {
                total += ((Number) column.getW()).intValue();
            }
            assertTrue(Math.abs(total - 9071) <= 3, "totaal=" + total);
        }
    }

    @Test
    void aTableInsideACell_isRefusedWithAClearMessage() {
        DocxConversionException ex = assertThrows(DocxConversionException.class, () -> convert(
                "<table><tbody><tr><td><table><tbody><tr><td>x</td></tr></tbody></table></td></tr></tbody></table>"));

        assertTrue(ex.getMessage().contains("inside a table cell"), ex.getMessage());
    }

    @Test
    void aTableWithoutRows_isSkipped() throws Exception {
        try (XWPFDocument doc = open(convert("<p>a</p><table></table><p>b</p>"))) {
            assertEquals(0, doc.getTables().size());
        }
    }

    @Test
    void tooManyColumns_isRefused() {
        String cells = "<td>x</td>".repeat(70);

        assertThrows(DocxConversionException.class,
                () -> convert("<table><tbody><tr>" + cells + "</tr></tbody></table>"));
    }

    // ----- herhaalde tabellen: de hele keten tot en met samenvoegen -----

    private static final String TRAVELER_TABLE = "<table data-repeat=\"booking.travelers\" data-item=\"t\"><tbody>"
            + "<tr><th>Voornaam</th><th>Achternaam</th></tr>"
            + "<tr><td>${t.firstname}</td><td>${t.lastname}</td></tr></tbody></table>";

    private static final TravelerContext MARIA = new TravelerContext("Maria", null, "Groot", "VROUW", null, "M.");
    private static final TravelerContext PIETER = new TravelerContext("Pieter", null, "Bakker", "MAN", null, "P.");

    @Test
    void repeatedTable_givesOneRowPerTraveler_andKeepsTheHeader() throws Exception {
        String merged = merge(convert(TRAVELER_TABLE), booking(MARIA, PIETER));

        assertEquals("Voornaam\tAchternaam\nMaria\tGroot\nPieter\tBakker", merged);
    }

    @Test
    void repeatedTable_withASingleItem_givesOneRow() throws Exception {
        assertEquals("Voornaam\tAchternaam\nMaria\tGroot", merge(convert(TRAVELER_TABLE), booking(MARIA)));
    }

    @Test
    void repeatedTable_withoutItems_keepsOnlyTheHeader() throws Exception {
        assertEquals("Voornaam\tAchternaam", merge(convert(TRAVELER_TABLE), booking()));
    }

    @Test
    void repeatedTable_hasNoLeftoverFieldsOrDirectivesInTheResult() throws Exception {
        String merged = merge(convert(TRAVELER_TABLE), booking(MARIA, PIETER));

        assertFalse(merged.contains("@before-row"), merged);
        assertFalse(merged.contains("@after-row"), merged);
        assertFalse(merged.contains("#list"), merged);
        assertFalse(merged.contains("${"), merged);
    }

    @Test
    void repeatedTable_nextToOtherContent_keepsThatContent() throws Exception {
        String merged = merge(convert("<p>Reizigers van ${booking.bookingNumber}:</p>" + TRAVELER_TABLE + "<p>Tot ziens</p>"),
                booking(MARIA, PIETER));

        assertEquals("Reizigers van B-2026-0042:\nVoornaam\tAchternaam\nMaria\tGroot\nPieter\tBakker\nTot ziens", merged);
    }

    @Test
    void twoRepeatedTables_eachRepeatTheirOwnList() throws Exception {
        String html = TRAVELER_TABLE
                + "<table data-repeat=\"booking.travelers\" data-item=\"x\"><tbody>"
                + "<tr><th>Initialen</th></tr><tr><td>${x.initials}</td></tr></tbody></table>";

        String merged = merge(convert(html), booking(MARIA, PIETER));

        assertEquals("Voornaam\tAchternaam\nMaria\tGroot\nPieter\tBakker\nInitialen\nM.\nP.", merged);
    }

    @Test
    void repeatedTable_withASingleColumn_works() throws Exception {
        String html = "<table data-repeat=\"booking.travelers\" data-item=\"t\"><tbody>"
                + "<tr><td>${t.firstname}</td></tr></tbody></table>";

        assertEquals("Maria\nPieter", merge(convert(html), booking(MARIA, PIETER)));
    }

    @Test
    void repeatedTable_doesNotTouchOrdinaryTablesInTheSameDocument() throws Exception {
        String html = "<table><tbody><tr><td>vast</td></tr></tbody></table>" + TRAVELER_TABLE;

        String merged = merge(convert(html), booking(MARIA, PIETER));

        assertEquals("vast\nVoornaam\tAchternaam\nMaria\tGroot\nPieter\tBakker", merged);
    }

    @Test
    void aRepeatedTable_withAnInjectedListExpression_isRefused() {
        String html = "<table data-repeat=\"booking.travelers as x><#assign y=1><#list booking.travelers\" data-item=\"t\">"
                + "<tbody><tr><td>x</td></tr></tbody></table>";

        assertThrows(RepeatTables.InvalidRepeatException.class, () -> convert(html));
    }

    // ----- afbeeldingen -----

    @Test
    void anImageFromTheLibrary_isEmbedded() throws Exception {
        byte[] docx = converter.convert("<p><img src=\"" + IMAGE_SRC + "\" alt=\"logo\"></p>",
                library("image/png", png(40, 20)));

        try (XWPFDocument doc = open(docx)) {
            assertEquals(1, doc.getAllPictures().size());
            assertEquals(org.apache.poi.xwpf.usermodel.XWPFDocument.PICTURE_TYPE_PNG,
                    doc.getAllPictures().get(0).getPictureType());
        }
    }

    @Test
    void anImageAsABlockInTheBody_isEmbeddedToo() throws Exception {
        byte[] docx = converter.convert("<img src=\"" + IMAGE_SRC + "\">", library("image/png", png(40, 20)));

        try (XWPFDocument doc = open(docx)) {
            assertEquals(1, doc.getAllPictures().size());
        }
    }

    @Test
    void anImageInATableCell_isEmbedded() throws Exception {
        byte[] docx = converter.convert(
                "<table><tbody><tr><td><p><img src=\"" + IMAGE_SRC + "\"></p></td></tr></tbody></table>",
                library("image/png", png(40, 20)));

        try (XWPFDocument doc = open(docx)) {
            assertEquals(1, doc.getAllPictures().size());
        }
    }

    @Test
    void jpegAndGif_areSupported() throws Exception {
        for (String type : new String[]{"image/jpeg", "image/gif"}) {
            BufferedImage image = new BufferedImage(10, 10, BufferedImage.TYPE_INT_RGB);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            ImageIO.write(image, type.equals("image/gif") ? "gif" : "jpg", out);

            byte[] docx = converter.convert("<p><img src=\"" + IMAGE_SRC + "\"></p>", library(type, out.toByteArray()));

            try (XWPFDocument doc = open(docx)) {
                assertEquals(1, doc.getAllPictures().size(), type);
            }
        }
    }

    private static long width(XWPFDocument doc) {
        return doc.getParagraphs().get(0).getRuns().get(0).getCTR().getDrawingArray(0)
                .getInlineArray(0).getExtent().getCx();
    }

    private static long height(XWPFDocument doc) {
        return doc.getParagraphs().get(0).getRuns().get(0).getCTR().getDrawingArray(0)
                .getInlineArray(0).getExtent().getCy();
    }

    @Test
    void imageSize_followsTheEditorWidthAndKeepsTheAspectRatio() throws Exception {
        byte[] docx = converter.convert("<p><img src=\"" + IMAGE_SRC + "\" width=\"200\"></p>",
                library("image/png", png(400, 100)));

        try (XWPFDocument doc = open(docx)) {
            assertEquals(200L * 9525, width(doc));
            assertEquals(50L * 9525, height(doc));
        }
    }

    @Test
    void imageSize_asTheEditorWritesItAfterResizing_winsOverTheNaturalSize() throws Exception {
        // De editor bewaart de sleepgrootte als width/height-attribuut, naast de vaste max-width/height:auto-stijl.
        byte[] docx = converter.convert("<p><img src=\"" + IMAGE_SRC
                        + "\" alt=\"logo\" width=\"169\" height=\"85\" style=\"max-width: 100%; height: auto;\"></p>",
                library("image/png", png(300, 150)));

        try (XWPFDocument doc = open(docx)) {
            assertEquals(169L * 9525, width(doc));
            assertEquals(85L * 9525, height(doc));
        }
    }

    @Test
    void imageSize_withoutAttributes_isTheNaturalSize() throws Exception {
        byte[] docx = converter.convert("<p><img src=\"" + IMAGE_SRC + "\"></p>", library("image/png", png(120, 60)));

        try (XWPFDocument doc = open(docx)) {
            assertEquals(120L * 9525, width(doc));
            assertEquals(60L * 9525, height(doc));
        }
    }

    @Test
    void imageSize_isNeverWiderThanThePage() throws Exception {
        byte[] docx = converter.convert("<p><img src=\"" + IMAGE_SRC + "\"></p>", library("image/png", png(2000, 1000)));

        try (XWPFDocument doc = open(docx)) {
            assertEquals(605L * 9525, width(doc));
            assertEquals(Math.round(1000 * (605.0 / 2000)) * 9525L, height(doc));
        }
    }

    @Test
    void imageSize_canComeFromTheStyleAttribute() throws Exception {
        byte[] docx = converter.convert("<p><img src=\"" + IMAGE_SRC + "\" style=\"width: 100px; height: 80px;\"></p>",
                library("image/png", png(400, 100)));

        try (XWPFDocument doc = open(docx)) {
            assertEquals(100L * 9525, width(doc));
            assertEquals(80L * 9525, height(doc));
        }
    }

    @Test
    void anAbsoluteUrlThatPointsAtTheLibrary_isResolvedByIdOnly() throws Exception {
        byte[] docx = converter.convert("<p><img src=\"https://anders.example" + IMAGE_SRC + "\"></p>",
                library("image/png", png(10, 10)));

        try (XWPFDocument doc = open(docx)) {
            assertEquals(1, doc.getAllPictures().size());
        }
    }

    @Test
    void anImageThatIsNotInTheLibraryOfThisOrganisation_isRefused() {
        DocxConversionException ex = assertThrows(DocxConversionException.class,
                () -> converter.convert("<p><img src=\"" + IMAGE_SRC + "\"></p>", NO_IMAGES));

        assertTrue(ex.getMessage().contains(IMAGE_ID.toString()), ex.getMessage());
    }

    @Test
    void imagesFromOutsideTheLibrary_areNeverFetched() {
        for (String src : new String[]{
                "http://169.254.169.254/latest/meta-data/", "https://evil.example/logo.png",
                "file:///etc/passwd", "data:image/png;base64,AAAA", "/images/logo.png", ""}) {
            DocxConversionException ex = assertThrows(DocxConversionException.class,
                    () -> converter.convert("<p><img src=\"" + src + "\"></p>", id -> {
                        throw new AssertionError("er mag niets worden opgezocht voor src=" + src);
                    }), "src=" + src);
            assertTrue(ex.getMessage().contains("not from the image library"), ex.getMessage());
        }
    }

    @Test
    void aWebpImage_isRefusedWithAHelpfulMessage() {
        DocxConversionException ex = assertThrows(DocxConversionException.class, () -> converter.convert(
                "<p><img src=\"" + IMAGE_SRC + "\"></p>", library("image/webp", new byte[]{1, 2, 3})));

        assertTrue(ex.getMessage().contains("PNG, JPEG or GIF"), ex.getMessage());
    }

    @Test
    void corruptImageBytes_areRefused() {
        assertThrows(DocxConversionException.class, () -> converter.convert(
                "<p><img src=\"" + IMAGE_SRC + "\"></p>", library("image/png", new byte[]{1, 2, 3})));
    }

    @Test
    void anImageWithMergeFieldsAroundIt_isMergedNormally() throws Exception {
        byte[] docx = converter.convert("<p>${booking.bookingNumber}</p><p><img src=\"" + IMAGE_SRC + "\"></p>",
                library("image/png", png(10, 10)));

        assertEquals("B-2026-0042", merge(docx, booking()));
    }

    // ----- veiligheid: wat de gebruiker typt blijft onder dezelfde afscherming als een upload -----

    @Test
    void aFreemarkerPayloadTypedInTheEditor_isStillBlockedWhenMerging() {
        byte[] docx = convert("<p>${\"freemarker.template.utility.Execute\"?new()(\"echo pwned\")}</p>");

        Exception ex = assertThrows(Exception.class, () -> merge(docx, booking()));

        Throwable root = ex;
        while (root.getCause() != null) root = root.getCause();
        assertTrue(String.valueOf(root.getMessage()).matches("(?s).*(not allowed in the template|api_builtin_enabled).*"),
                root.getMessage());
    }

    @Test
    void reflectionThroughTheModel_isStillImpossible() {
        byte[] docx = convert("<p>${booking.class}</p>");

        assertThrows(Exception.class, () -> merge(docx, booking()));
    }

    @Test
    void theGeneratedDocument_isLoadableAsAReportWithoutExtraConfiguration() throws Exception {
        byte[] docx = convert(TRAVELER_TABLE + "<p>${booking.bookingNumber}</p>");

        IXDocReport report = XDocReportRegistry.getRegistry().loadReport(
                new ByteArrayInputStream(docx), TemplateEngineKind.Freemarker);

        assertNotNull(report);
        assertEquals(Map.of(), Map.of()); // geen verborgen vereisten; het laden zelf is de test
    }

    @Test
    void aRichTemplate_alsoConvertsToPdf() throws Exception {
        // De app kan een document ook als PDF genereren (xdocreport via XWPF): dat moet ook met een editor-template.
        String html = "<h1>Offerte ${booking.bookingNumber}</h1>"
                + "<p><strong>Beste</strong> <em>${booking.booker.firstname}</em>, zie <a href=\"https://puurkroatie.nl\">de site</a>.</p>"
                + "<ul><li><p>een</p><ul><li><p>binnen</p></li></ul></li></ul><ol><li><p>nummer</p></li></ol>"
                + "<table><tbody><tr><td rowspan=\"2\">hoog</td><td colspan=\"1\">a</td></tr><tr><td>b</td></tr></tbody></table>"
                + TRAVELER_TABLE
                + "<p><img src=\"" + IMAGE_SRC + "\"></p>";
        byte[] docx = converter.convert(html, library("image/png", png(60, 30)));

        IXDocReport report = XDocReportRegistry.getRegistry().loadReport(
                new ByteArrayInputStream(docx), TemplateEngineKind.Freemarker);
        FreemarkerHardening.harden(report);
        IContext context = report.createContext();
        context.put("booking", TemplateModels.toModel(booking(MARIA, PIETER)));
        ByteArrayOutputStream pdf = new ByteArrayOutputStream();
        report.convert(context, Options.getTo(ConverterTypeTo.PDF).via(ConverterTypeVia.XWPF), pdf);

        assertTrue(pdf.size() > 1000);
        assertEquals("%PDF", new String(pdf.toByteArray(), 0, 4, java.nio.charset.StandardCharsets.US_ASCII));
    }
}
