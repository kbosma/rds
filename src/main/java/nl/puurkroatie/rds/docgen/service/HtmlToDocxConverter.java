package nl.puurkroatie.rds.docgen.service;

import nl.puurkroatie.rds.email.service.EmailImageUrlResolver;
import org.apache.poi.util.Units;
import org.apache.poi.xwpf.usermodel.Borders;
import org.apache.poi.xwpf.usermodel.ParagraphAlignment;
import org.apache.poi.xwpf.usermodel.UnderlinePatterns;
import org.apache.poi.xwpf.usermodel.VerticalAlign;
import org.apache.poi.xwpf.usermodel.XWPFAbstractNum;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFNumbering;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFStyles;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.apache.poi.xwpf.usermodel.XWPFTable;
import org.apache.poi.xwpf.usermodel.XWPFTableCell;
import org.apache.poi.xwpf.usermodel.XWPFTableRow;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Element;
import org.jsoup.nodes.Node;
import org.jsoup.nodes.TextNode;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTAbstractNum;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTBorder;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTFonts;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTLvl;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTNum;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTNumLvl;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTPageMar;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTPageSz;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTSectPr;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTShd;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTTblBorders;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTTblGrid;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTTblPr;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTTblWidth;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTTcPr;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.STBorder;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.STMerge;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.STMultiLevelType;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.STNumberFormat;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.STShd;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.STTblWidth;
import org.springframework.stereotype.Component;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigInteger;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Maakt van de HTML uit de WYSIWYG-editor een echt .docx-bestand (A4), dat daarna door dezelfde
 * xdocreport/FreeMarker-straat gaat als een geüpload bestand: {@code ${booking.bookingNumber}} in de
 * tekst wordt bij het genereren ingevuld.
 *
 * Ondersteund (alles wat de editor kan maken): alinea's, koppen, vet/cursief/onderstreept/doorgehaald,
 * lettertype, -grootte en kleur, links, opsommingen en genummerde lijsten (ook genest), tabellen
 * (kolom-/rijsamenvoeging, kopcel), afbeeldingen uit de bibliotheek, horizontale lijn, citaat en
 * codeblok. Een herhaalde tabel ({@code data-repeat}, zie {@link RepeatTables}) wordt een Word-tabel
 * waarvan de laatste rij met samenvoegvelden {@code @before-row}/{@code @after-row} wordt herhaald.
 *
 * De HTML komt van een gebruiker en wordt als data behandeld: onbekende elementen worden genegeerd
 * (inhoud blijft staan), scripts/stijlen vervallen, er worden nooit URL's opgehaald. Een afbeelding
 * wordt uitsluitend via het id uit de eigen bibliotheek geladen.
 */
@Component
public class HtmlToDocxConverter {

    /** Afbeelding uit de bibliotheek. */
    public record Image(byte[] data, String contentType) {
    }

    /** Zoekt een afbeelding op id (al beperkt tot de eigen organisatie door degene die dit levert). */
    @FunctionalInterface
    public interface ImageLookup {
        Optional<Image> find(UUID imageId);
    }

    /** De HTML kan niet (volledig) naar Word worden omgezet; de boodschap is voor de gebruiker bedoeld. */
    public static class DocxConversionException extends RuntimeException {
        public DocxConversionException(String message) {
            super(message);
        }

        public DocxConversionException(String message, Throwable cause) {
            super(message, cause);
        }
    }

    private static final String DEFAULT_FONT = "Calibri";
    private static final double DEFAULT_SIZE_PT = 11;
    private static final String TABLE_BORDER_COLOR = "CCCCCC";
    private static final String TABLE_HEADER_FILL = "F0F0F0";
    private static final String LINK_COLOR = "0563C1";

    /** Tekstbreedte van een A4 met 2,5 cm marge (16 cm) in pixels bij 96 dpi. */
    private static final int MAX_IMAGE_WIDTH_PX = 605;
    private static final int MAX_TABLE_COLUMNS = 64;
    /** Tekstbreedte van een A4 met 2,5 cm marge, in twips (1/20 punt). */
    private static final int TEXT_WIDTH_TWIPS = 9071;
    private static final int LIST_LEVELS = 9;

    private static final Set<String> BLOCK_TAGS = Set.of(
            "p", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "table", "blockquote", "pre", "hr",
            "div", "section", "article", "header", "footer", "figure", "img");
    private static final Set<String> IGNORED_TAGS = Set.of(
            "script", "style", "iframe", "object", "embed", "svg", "canvas", "template", "head", "title", "meta", "link");
    private static final Set<String> SAFE_LINK_SCHEMES = Set.of("http", "https", "mailto", "tel");

    private static final Pattern WHITESPACE = Pattern.compile("\\s+");
    private static final Pattern NUMBER = Pattern.compile("(-?\\d+(?:\\.\\d+)?)");
    private static final Pattern FONT_SIZE = Pattern.compile("(\\d+(?:\\.\\d+)?)\\s*(px|pt)?");
    private static final Pattern HEX_COLOR = Pattern.compile("#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})");
    private static final Pattern RGB_COLOR = Pattern.compile(
            "rgba?\\(\\s*(\\d{1,3})\\s*,\\s*(\\d{1,3})\\s*,\\s*(\\d{1,3})\\s*(?:,\\s*[\\d.]+\\s*)?\\)");

    public byte[] convert(String html, ImageLookup images) {
        try (XWPFDocument document = new XWPFDocument();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            new Builder(document, images).build(html == null ? "" : html);
            document.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new DocxConversionException("The Word document could not be created: " + e.getMessage(), e);
        }
    }

    // ----------------------------------------------------------------------------------------------
    // Opmaak die doorgegeven wordt tijdens het aflopen van de HTML (onveranderlijk)
    // ----------------------------------------------------------------------------------------------

    private record RunStyle(boolean bold, boolean italic, boolean underline, boolean strike,
                            VerticalAlign vertical, String fontFamily, double sizePt, String colorHex,
                            String linkUri, boolean preformatted) {

        static RunStyle defaults() {
            return new RunStyle(false, false, false, false, null, DEFAULT_FONT, DEFAULT_SIZE_PT, null, null, false);
        }

        RunStyle withBold() {
            return new RunStyle(true, italic, underline, strike, vertical, fontFamily, sizePt, colorHex, linkUri, preformatted);
        }

        RunStyle withItalic() {
            return new RunStyle(bold, true, underline, strike, vertical, fontFamily, sizePt, colorHex, linkUri, preformatted);
        }

        RunStyle withUnderline() {
            return new RunStyle(bold, italic, true, strike, vertical, fontFamily, sizePt, colorHex, linkUri, preformatted);
        }

        RunStyle withStrike() {
            return new RunStyle(bold, italic, underline, true, vertical, fontFamily, sizePt, colorHex, linkUri, preformatted);
        }

        RunStyle withVertical(VerticalAlign v) {
            return new RunStyle(bold, italic, underline, strike, v, fontFamily, sizePt, colorHex, linkUri, preformatted);
        }

        RunStyle withFont(String family) {
            return new RunStyle(bold, italic, underline, strike, vertical, family, sizePt, colorHex, linkUri, preformatted);
        }

        RunStyle withSize(double pt) {
            return new RunStyle(bold, italic, underline, strike, vertical, fontFamily, pt, colorHex, linkUri, preformatted);
        }

        RunStyle withColor(String hex) {
            return new RunStyle(bold, italic, underline, strike, vertical, fontFamily, sizePt, hex, linkUri, preformatted);
        }

        RunStyle withLink(String uri) {
            return new RunStyle(bold, italic, true, strike, vertical, fontFamily, sizePt, LINK_COLOR, uri, preformatted);
        }

        RunStyle withPreformatted() {
            return new RunStyle(bold, italic, underline, strike, vertical, "Courier New", sizePt, colorHex, linkUri, true);
        }
    }

    /** Alinea-opmaak: inspringing, uitlijning, afstand en (alleen voor het eerste alinea van een lijstitem) nummering. */
    private record Fmt(int indentTwips, ParagraphAlignment align, RunStyle style, BigInteger numId, int level,
                       int spacingBefore, int spacingAfter) {

        static Fmt root() {
            return new Fmt(0, null, RunStyle.defaults(), null, 0, 0, 120);
        }

        Fmt withStyle(RunStyle s) {
            return new Fmt(indentTwips, align, s, numId, level, spacingBefore, spacingAfter);
        }

        Fmt withAlign(ParagraphAlignment a) {
            return a == null ? this : new Fmt(indentTwips, a, style, numId, level, spacingBefore, spacingAfter);
        }

        Fmt withIndent(int twips) {
            return new Fmt(twips, align, style, numId, level, spacingBefore, spacingAfter);
        }

        Fmt withNumbering(BigInteger id, int lvl) {
            return new Fmt(indentTwips, align, style, id, lvl, spacingBefore, 40);
        }

        Fmt withoutNumbering() {
            return new Fmt(indentTwips, align, style, null, 0, spacingBefore, spacingAfter);
        }

        Fmt withSpacing(int before, int after) {
            return new Fmt(indentTwips, align, style, numId, level, before, after);
        }
    }

    /** Waar alinea's terechtkomen: in het document of in een tabelcel. */
    private interface Target {
        XWPFParagraph newParagraph();

        XWPFTable newTable();
    }

    // ----------------------------------------------------------------------------------------------

    private final class Builder {

        private final XWPFDocument document;
        private final ImageLookup images;
        private BigInteger bulletAbstractId;
        private BigInteger decimalAbstractId;
        private BigInteger bulletNumId;

        Builder(XWPFDocument document, ImageLookup images) {
            this.document = document;
            this.images = images;
        }

        void build(String html) {
            setUpStyles();
            setUpPage();
            Element body = Jsoup.parseBodyFragment(html).body();
            blocks(documentTarget(), body.childNodes(), Fmt.root());
            if (document.getParagraphs().isEmpty() && document.getTables().isEmpty()) {
                document.createParagraph();
            }
        }

        /**
         * Een document zonder stijlen-onderdeel (wat POI standaard maakt) is voor Word geen probleem, maar de
         * PDF-conversie (xdocreport) weigert het. Een leeg onderdeel met standaardlettertype volstaat.
         */
        private void setUpStyles() {
            XWPFStyles styles = document.createStyles();
            CTFonts fonts = CTFonts.Factory.newInstance();
            fonts.setAscii(DEFAULT_FONT);
            fonts.setHAnsi(DEFAULT_FONT);
            fonts.setCs(DEFAULT_FONT);
            styles.setDefaultFonts(fonts);
        }

        private void setUpPage() {
            CTSectPr section = document.getDocument().getBody().isSetSectPr()
                    ? document.getDocument().getBody().getSectPr()
                    : document.getDocument().getBody().addNewSectPr();
            CTPageSz size = section.isSetPgSz() ? section.getPgSz() : section.addNewPgSz();
            size.setW(BigInteger.valueOf(11906)); // A4
            size.setH(BigInteger.valueOf(16838));
            CTPageMar margin = section.isSetPgMar() ? section.getPgMar() : section.addNewPgMar();
            margin.setTop(BigInteger.valueOf(1417)); // 2,5 cm
            margin.setBottom(BigInteger.valueOf(1417));
            margin.setLeft(BigInteger.valueOf(1417));
            margin.setRight(BigInteger.valueOf(1417));
            margin.setHeader(BigInteger.valueOf(708));
            margin.setFooter(BigInteger.valueOf(708));
        }

        private Target documentTarget() {
            return new Target() {
                @Override
                public XWPFParagraph newParagraph() {
                    return document.createParagraph();
                }

                @Override
                public XWPFTable newTable() {
                    return document.createTable();
                }
            };
        }

        /** De eerste alinea van een cel bestaat al (Word eist er één); de volgende worden toegevoegd. */
        private Target cellTarget(XWPFTableCell cell, XWPFParagraph prepared) {
            return new Target() {
                private boolean firstUsed;

                @Override
                public XWPFParagraph newParagraph() {
                    if (!firstUsed) {
                        firstUsed = true;
                        return prepared != null ? prepared : cell.getParagraphs().get(0);
                    }
                    return cell.addParagraph();
                }

                @Override
                public XWPFTable newTable() {
                    throw new DocxConversionException("Tables inside a table cell are not supported in a Word template.");
                }
            };
        }

        // ------------------------------------------------------------------------------------------
        // Blokken
        // ------------------------------------------------------------------------------------------

        private boolean isBlock(Node node) {
            return node instanceof Element e && BLOCK_TAGS.contains(e.normalName());
        }

        private boolean isIgnored(Node node) {
            return node instanceof Element e && IGNORED_TAGS.contains(e.normalName());
        }

        private void blocks(Target target, List<Node> nodes, Fmt fmt) {
            XWPFParagraph open = null;
            for (Node node : nodes) {
                if (isIgnored(node)) {
                    continue;
                }
                if (isBlock(node)) {
                    open = null;
                    block(target, (Element) node, fmt);
                } else if (node instanceof Element e && "br".equals(e.normalName()) && open == null) {
                    paragraph(target, fmt); // los regeleinde op blokniveau = lege regel
                } else {
                    if (open == null && node instanceof TextNode t && t.isBlank()) {
                        continue;
                    }
                    if (open == null) {
                        open = paragraph(target, fmt);
                    }
                    inline(open, node, fmt.style());
                }
            }
        }

        private void block(Target target, Element el, Fmt fmt) {
            switch (el.normalName()) {
                case "p" -> {
                    XWPFParagraph p = paragraph(target, fmt.withAlign(alignOf(el)));
                    inlineChildren(p, el, fmt.style());
                }
                case "h1" -> heading(target, el, fmt, 20, 240);
                case "h2" -> heading(target, el, fmt, 16, 200);
                case "h3" -> heading(target, el, fmt, 14, 160);
                case "h4" -> heading(target, el, fmt, 12, 120);
                case "h5" -> heading(target, el, fmt, 11, 120);
                case "h6" -> heading(target, el, fmt, 10, 120);
                case "ul" -> list(target, el, fmt, false, 0, null);
                case "ol" -> list(target, el, fmt, true, 0, null);
                case "li" -> list(target, el, fmt, false, 0, null); // los li: behandel als opsomming
                case "table" -> table(target, el, fmt);
                case "blockquote" -> blocks(target, el.childNodes(),
                        fmt.withIndent(fmt.indentTwips() + 720).withStyle(fmt.style().withItalic()));
                case "pre" -> preformatted(target, el, fmt);
                case "hr" -> {
                    XWPFParagraph p = paragraph(target, fmt);
                    p.setBorderBottom(Borders.SINGLE);
                }
                case "img" -> {
                    XWPFParagraph p = paragraph(target, fmt);
                    image(p, el);
                }
                default -> blocks(target, el.childNodes(), fmt); // div, section, ...: alleen een container
            }
        }

        private void heading(Target target, Element el, Fmt fmt, double sizePt, int spacingBefore) {
            RunStyle style = fmt.style().withBold().withSize(sizePt);
            XWPFParagraph p = paragraph(target, fmt.withAlign(alignOf(el)).withStyle(style).withSpacing(spacingBefore, 120));
            inlineChildren(p, el, style);
        }

        private void preformatted(Target target, Element el, Fmt fmt) {
            RunStyle style = fmt.style().withPreformatted();
            XWPFParagraph p = paragraph(target, fmt.withStyle(style));
            inlineChildren(p, el, style);
        }

        private XWPFParagraph paragraph(Target target, Fmt fmt) {
            XWPFParagraph p = target.newParagraph();
            if (fmt.numId() != null) {
                p.setNumID(fmt.numId());
                p.setNumILvl(BigInteger.valueOf(Math.min(fmt.level(), LIST_LEVELS - 1)));
            } else if (fmt.indentTwips() > 0) {
                p.setIndentationLeft(fmt.indentTwips());
            }
            if (fmt.align() != null) {
                p.setAlignment(fmt.align());
            }
            p.setSpacingBefore(fmt.spacingBefore());
            p.setSpacingAfter(fmt.spacingAfter());
            return p;
        }

        // ------------------------------------------------------------------------------------------
        // Lijsten
        // ------------------------------------------------------------------------------------------

        private void list(Target target, Element list, Fmt fmt, boolean ordered, int level, BigInteger numId) {
            if ("ol".equals(list.normalName())) {
                ordered = true;
            }
            // Elke genummerde lijst begint weer bij 1; alle opsommingen delen één nummering.
            BigInteger id = numId != null ? numId : ordered ? newDecimalNumbering() : bulletNumbering();
            boolean isOrdered = ordered;
            for (Element child : list.children()) {
                if ("li".equals(child.normalName())) {
                    listItem(target, child, fmt, isOrdered, level, id);
                }
            }
        }

        private void listItem(Target target, Element li, Fmt fmt, boolean ordered, int level, BigInteger numId) {
            Fmt numbered = fmt.withNumbering(numId, level);
            Fmt continuation = fmt.withoutNumbering().withIndent(720 * (level + 1)).withSpacing(0, 40);
            boolean numberedUsed = false;
            List<Node> inlineRun = new ArrayList<>();

            for (Node child : li.childNodes()) {
                if (isIgnored(child)) {
                    continue;
                }
                if (child instanceof Element e && ("ul".equals(e.normalName()) || "ol".equals(e.normalName()))) {
                    numberedUsed |= flushInline(target, inlineRun, numberedUsed ? continuation : numbered);
                    list(target, e, fmt, "ol".equals(e.normalName()), level + 1, null);
                } else if (isBlock(child)) {
                    numberedUsed |= flushInline(target, inlineRun, numberedUsed ? continuation : numbered);
                    blocks(target, List.of(child), numberedUsed ? continuation : numbered);
                    numberedUsed = true;
                } else {
                    inlineRun.add(child);
                }
            }
            flushInline(target, inlineRun, numberedUsed ? continuation : numbered);
            if (!numberedUsed && li.childNodeSize() == 0) {
                paragraph(target, numbered); // leeg lijstitem blijft zichtbaar als item
            }
        }

        /** Rendert opgespaarde inline-inhoud van een lijstitem als één alinea; levert of er iets is geplaatst. */
        private boolean flushInline(Target target, List<Node> pending, Fmt fmt) {
            boolean blank = pending.stream().allMatch(n -> n instanceof TextNode t && t.isBlank());
            if (pending.isEmpty() || blank) {
                pending.clear();
                return false;
            }
            blocks(target, new ArrayList<>(pending), fmt);
            pending.clear();
            return true;
        }

        private BigInteger bulletNumbering() {
            if (bulletNumId == null) {
                bulletNumId = createNum(bulletAbstract(), false);
            }
            return bulletNumId;
        }

        private BigInteger newDecimalNumbering() {
            return createNum(decimalAbstract(), true);
        }

        private XWPFNumbering numbering() {
            XWPFNumbering numbering = document.getNumbering();
            return numbering != null ? numbering : document.createNumbering();
        }

        private BigInteger bulletAbstract() {
            if (bulletAbstractId == null) {
                bulletAbstractId = addAbstract(true);
            }
            return bulletAbstractId;
        }

        private BigInteger decimalAbstract() {
            if (decimalAbstractId == null) {
                decimalAbstractId = addAbstract(false);
            }
            return decimalAbstractId;
        }

        private BigInteger addAbstract(boolean bullet) {
            XWPFNumbering numbering = numbering();
            BigInteger abstractId = BigInteger.valueOf(bullet ? 0 : 1);
            CTAbstractNum abs = CTAbstractNum.Factory.newInstance();
            abs.setAbstractNumId(abstractId);
            abs.addNewMultiLevelType().setVal(STMultiLevelType.HYBRID_MULTILEVEL);
            String[] bulletChars = {"•", "o", "▪"};
            STNumberFormat.Enum[] decimalFormats = {STNumberFormat.DECIMAL, STNumberFormat.LOWER_LETTER, STNumberFormat.LOWER_ROMAN};
            for (int i = 0; i < LIST_LEVELS; i++) {
                CTLvl lvl = abs.addNewLvl();
                lvl.setIlvl(BigInteger.valueOf(i));
                lvl.addNewStart().setVal(BigInteger.ONE);
                if (bullet) {
                    lvl.addNewNumFmt().setVal(STNumberFormat.BULLET);
                    lvl.addNewLvlText().setVal(bulletChars[i % bulletChars.length]);
                } else {
                    lvl.addNewNumFmt().setVal(decimalFormats[i % decimalFormats.length]);
                    lvl.addNewLvlText().setVal("%" + (i + 1) + ".");
                }
                lvl.addNewPPr().addNewInd().setLeft(BigInteger.valueOf(720L * (i + 1)));
                lvl.getPPr().getInd().setHanging(BigInteger.valueOf(360));
            }
            return numbering.addAbstractNum(new XWPFAbstractNum(abs));
        }

        private BigInteger createNum(BigInteger abstractId, boolean restart) {
            XWPFNumbering numbering = numbering();
            BigInteger numId = numbering.addNum(abstractId);
            if (restart) {
                // Zonder startOverride gaat een tweede genummerde lijst verder waar de eerste ophield.
                CTNum num = numbering.getNum(numId).getCTNum();
                for (int i = 0; i < LIST_LEVELS; i++) {
                    CTNumLvl override = num.addNewLvlOverride();
                    override.setIlvl(BigInteger.valueOf(i));
                    override.addNewStartOverride().setVal(BigInteger.ONE);
                }
            }
            return numId;
        }

        // ------------------------------------------------------------------------------------------
        // Tabellen
        // ------------------------------------------------------------------------------------------

        private void table(Target target, Element tableEl, Fmt fmt) {
            List<Element> rows = rowsOf(tableEl);
            if (rows.isEmpty()) {
                return;
            }
            Optional<RepeatTables.Repeat> repeat = RepeatTables.of(tableEl); // ongeldige lijst/item: exception
            Element repeatingRow = repeat.isPresent() ? rows.get(rows.size() - 1) : null;

            XWPFTable table = target.newTable();
            table.removeRow(0); // createTable() levert een rij van 1 cel; we bouwen de rijen zelf op
            styleTable(table);

            int columns = 0;                              // aantal rasterkolommen van de tabel
            int[] knownWidth = new int[MAX_TABLE_COLUMNS]; // vastgelegde kolombreedte in twips (0 = onbekend)
            int[] carry = new int[MAX_TABLE_COLUMNS];     // hoeveel rijen een rowspan nog doorloopt, per kolom
            int[] carrySpan = new int[MAX_TABLE_COLUMNS]; // kolombreedte van die doorlopende cel

            for (Element rowEl : rows) {
                List<Element> cells = cellsOf(rowEl);
                XWPFTableRow row = new XWPFTableRow(org.openxmlformats.schemas.wordprocessingml.x2006.main.CTRow.Factory.newInstance(), table);
                boolean isRepeating = rowEl == repeatingRow;
                boolean allHeader = !cells.isEmpty() && cells.stream().allMatch(c -> "th".equals(c.normalName()));

                int col = 0;
                int index = 0;
                Iterator<Element> it = cells.iterator();
                while (true) {
                    while (col < MAX_TABLE_COLUMNS && carry[col] > 0) { // rowspan van een rij erboven
                        XWPFTableCell continuation = row.addNewTableCell();
                        CTTcPr pr = properties(continuation);
                        if (carrySpan[col] > 1) {
                            pr.addNewGridSpan().setVal(BigInteger.valueOf(carrySpan[col]));
                        }
                        pr.addNewVMerge(); // zonder waarde = "voortzetting"
                        carry[col]--;
                        col += Math.max(1, carrySpan[col]);
                    }
                    if (!it.hasNext()) {
                        break;
                    }
                    Element cellEl = it.next();
                    int colspan = clamp(attrInt(cellEl, "colspan", 1), 1, MAX_TABLE_COLUMNS - 1);
                    int rowspan = clamp(attrInt(cellEl, "rowspan", 1), 1, 1000);
                    if (col + colspan > MAX_TABLE_COLUMNS) {
                        throw new DocxConversionException("A table in the template has too many columns (maximum "
                                + MAX_TABLE_COLUMNS + ").");
                    }

                    XWPFTableCell cell = row.addNewTableCell();
                    CTTcPr pr = properties(cell);
                    if (colspan > 1) {
                        pr.addNewGridSpan().setVal(BigInteger.valueOf(colspan));
                    }
                    if (rowspan > 1) {
                        pr.addNewVMerge().setVal(STMerge.RESTART);
                        carry[col] = rowspan - 1;
                        carrySpan[col] = colspan;
                    }
                    Integer widthPx = columnWidth(cellEl);
                    if (widthPx != null) {
                        CTTblWidth w = pr.addNewTcW();
                        w.setType(STTblWidth.DXA);
                        w.setW(BigInteger.valueOf(widthPx * 15L));
                        if (colspan == 1) {
                            knownWidth[col] = widthPx * 15;
                        }
                    }
                    boolean header = "th".equals(cellEl.normalName());
                    if (header) {
                        CTShd shd = pr.addNewShd();
                        shd.setVal(STShd.CLEAR);
                        shd.setFill(TABLE_HEADER_FILL);
                    }

                    // Eerste cel van de herhalende rij: het "voor de rij"-veld komt vóór de inhoud.
                    XWPFParagraph prepared = null;
                    if (isRepeating && index == 0) {
                        prepared = cell.getParagraphs().get(0);
                        mergeField(prepared, "@before-row[#list " + repeat.get().list() + " as " + repeat.get().item() + "]");
                    }
                    Fmt cellFmt = fmt.withSpacing(0, 0).withoutNumbering().withIndent(0)
                            .withStyle(header ? fmt.style().withBold() : fmt.style())
                            .withAlign(alignOf(cellEl));
                    blocks(cellTarget(cell, prepared), cellEl.childNodes(), cellFmt);

                    // Laatste cel van de herhalende rij: het "na de rij"-veld komt na de inhoud.
                    if (isRepeating && index == cells.size() - 1) {
                        List<XWPFParagraph> paragraphs = cell.getParagraphs();
                        mergeField(paragraphs.get(paragraphs.size() - 1), "@after-row[/#list]");
                    }
                    col += colspan;
                    index++;
                }
                columns = Math.max(columns, col);

                if (row.getTableCells().isEmpty()) {
                    continue;
                }
                if (allHeader) {
                    row.setRepeatHeader(true);
                }
                table.addRow(row);
            }

            writeGrid(table, columns, knownWidth);

            // Zonder alinea na een tabel plakt Word de tabel aan wat erna komt.
            XWPFParagraph spacer = target.newParagraph();
            spacer.setSpacingAfter(0);
        }

        /**
         * Het raster van de tabel (w:tblGrid): Word en andere lezers (o.a. de PDF-conversie) verwachten het.
         * Bekende kolombreedtes blijven staan; de rest verdeelt de overgebleven tekstbreedte gelijk.
         */
        private void writeGrid(XWPFTable table, int columns, int[] knownWidth) {
            if (columns == 0) {
                return;
            }
            int known = 0;
            int unknown = 0;
            for (int i = 0; i < columns; i++) {
                if (knownWidth[i] > 0) {
                    known += knownWidth[i];
                } else {
                    unknown++;
                }
            }
            int share = unknown == 0 ? 0 : Math.max(500, (TEXT_WIDTH_TWIPS - known) / unknown);
            CTTblGrid grid = table.getCTTbl().getTblGrid() != null ? table.getCTTbl().getTblGrid() : table.getCTTbl().addNewTblGrid();
            while (grid.sizeOfGridColArray() > 0) {
                grid.removeGridCol(0);
            }
            for (int i = 0; i < columns; i++) {
                grid.addNewGridCol().setW(BigInteger.valueOf(knownWidth[i] > 0 ? knownWidth[i] : share));
            }
        }

        private List<Element> rowsOf(Element table) {
            List<Element> rows = new ArrayList<>();
            for (Element child : table.children()) {
                switch (child.normalName()) {
                    case "tr" -> rows.add(child);
                    case "thead", "tbody", "tfoot" -> {
                        for (Element tr : child.children()) {
                            if ("tr".equals(tr.normalName())) {
                                rows.add(tr);
                            }
                        }
                    }
                    default -> {
                    }
                }
            }
            return rows;
        }

        private List<Element> cellsOf(Element row) {
            List<Element> cells = new ArrayList<>();
            for (Element child : row.children()) {
                if ("td".equals(child.normalName()) || "th".equals(child.normalName())) {
                    cells.add(child);
                }
            }
            return cells;
        }

        private CTTcPr properties(XWPFTableCell cell) {
            return cell.getCTTc().isSetTcPr() ? cell.getCTTc().getTcPr() : cell.getCTTc().addNewTcPr();
        }

        private void styleTable(XWPFTable table) {
            CTTblPr properties = table.getCTTbl().getTblPr() != null ? table.getCTTbl().getTblPr() : table.getCTTbl().addNewTblPr();
            CTTblWidth width = properties.isSetTblW() ? properties.getTblW() : properties.addNewTblW();
            width.setType(STTblWidth.PCT);
            width.setW(BigInteger.valueOf(5000)); // 100%

            CTTblBorders borders = properties.isSetTblBorders() ? properties.getTblBorders() : properties.addNewTblBorders();
            // POI maakt een nieuwe tabel al met (kleurloze) randen; die passen we aan i.p.v. er een tweede bij te zetten.
            for (CTBorder border : new CTBorder[]{
                    borders.isSetTop() ? borders.getTop() : borders.addNewTop(),
                    borders.isSetBottom() ? borders.getBottom() : borders.addNewBottom(),
                    borders.isSetLeft() ? borders.getLeft() : borders.addNewLeft(),
                    borders.isSetRight() ? borders.getRight() : borders.addNewRight(),
                    borders.isSetInsideH() ? borders.getInsideH() : borders.addNewInsideH(),
                    borders.isSetInsideV() ? borders.getInsideV() : borders.addNewInsideV()}) {
                border.setVal(STBorder.SINGLE);
                border.setSz(BigInteger.valueOf(4));
                border.setSpace(BigInteger.ZERO);
                border.setColor(TABLE_BORDER_COLOR);
            }
            table.setCellMargins(60, 100, 60, 100);
        }

        /** Kolombreedte in pixels als de editor die heeft vastgelegd (tabel met versleepte kolommen). */
        private Integer columnWidth(Element cell) {
            String raw = cell.attr("colwidth");
            if (raw.isBlank()) {
                return null;
            }
            Matcher m = NUMBER.matcher(raw);
            if (!m.find()) {
                return null;
            }
            int px = (int) Math.round(Double.parseDouble(m.group(1)));
            return px >= 20 && px <= 2000 ? px : null;
        }

        /** Een samenvoegveld zoals Word dat maakt; xdocreport haalt de naam eruit als FreeMarker-directive. */
        private void mergeField(XWPFParagraph paragraph, String name) {
            var field = paragraph.getCTP().addNewFldSimple();
            field.setInstr(" MERGEFIELD  \"" + name + "\"  \\* MERGEFORMAT ");
            field.addNewR().addNewT().setStringValue("«" + name + "»");
        }

        // ------------------------------------------------------------------------------------------
        // Inline: tekst, opmaak, links, afbeeldingen
        // ------------------------------------------------------------------------------------------

        private void inlineChildren(XWPFParagraph p, Element parent, RunStyle style) {
            List<Node> children = parent.childNodes();
            // <p><br></p> (de afsluitende regeleinde van de editor) is een lege alinea, geen extra regel.
            if (children.size() == 1 && children.get(0) instanceof Element e && "br".equals(e.normalName())) {
                return;
            }
            for (Node child : children) {
                inline(p, child, style);
            }
        }

        private void inline(XWPFParagraph p, Node node, RunStyle style) {
            if (node instanceof TextNode text) {
                addText(p, text.getWholeText(), style);
                return;
            }
            if (!(node instanceof Element el) || isIgnored(node)) {
                return;
            }
            switch (el.normalName()) {
                case "br" -> p.createRun().addBreak();
                case "img" -> image(p, el);
                case "strong", "b" -> inlineChildren(p, el, applyStyleAttr(el, style.withBold()));
                case "em", "i" -> inlineChildren(p, el, applyStyleAttr(el, style.withItalic()));
                case "u" -> inlineChildren(p, el, applyStyleAttr(el, style.withUnderline()));
                case "s", "strike", "del" -> inlineChildren(p, el, applyStyleAttr(el, style.withStrike()));
                case "code" -> inlineChildren(p, el, applyStyleAttr(el, style.withFont("Courier New")));
                case "sub" -> inlineChildren(p, el, style.withVertical(VerticalAlign.SUBSCRIPT));
                case "sup" -> inlineChildren(p, el, style.withVertical(VerticalAlign.SUPERSCRIPT));
                case "a" -> {
                    String uri = safeLink(el.attr("href"));
                    inlineChildren(p, el, uri != null ? style.withLink(uri) : style);
                }
                default -> {
                    if (isBlock(el)) { // blok in een inline-context (bv. <p> in <span>): als losse regel
                        p.createRun().addBreak();
                    }
                    inlineChildren(p, el, applyStyleAttr(el, style));
                }
            }
        }

        private void addText(XWPFParagraph p, String raw, RunStyle style) {
            if (style.preformatted()) {
                String[] lines = raw.replace("\r\n", "\n").split("\n", -1);
                for (int i = 0; i < lines.length; i++) {
                    XWPFRun run = newRun(p, style);
                    run.setText(lines[i]);
                    if (i < lines.length - 1) {
                        run.addBreak();
                    }
                }
                return;
            }
            String text = WHITESPACE.matcher(raw).replaceAll(" ");
            if (text.isEmpty()) {
                return;
            }
            newRun(p, style).setText(text);
        }

        private XWPFRun newRun(XWPFParagraph p, RunStyle style) {
            XWPFRun run = style.linkUri() != null ? p.createHyperlinkRun(style.linkUri()) : p.createRun();
            run.setFontFamily(style.fontFamily());
            run.setFontSize(style.sizePt());
            run.setBold(style.bold());
            run.setItalic(style.italic());
            if (style.underline()) {
                run.setUnderline(UnderlinePatterns.SINGLE);
            }
            run.setStrikeThrough(style.strike());
            if (style.vertical() != null) {
                run.setSubscript(style.vertical());
            }
            if (style.colorHex() != null) {
                run.setColor(style.colorHex());
            }
            return run;
        }

        private String safeLink(String href) {
            String value = href == null ? "" : href.trim();
            int colon = value.indexOf(':');
            if (colon <= 0) {
                return null; // relatief of leeg: in een Word-document betekenisloos
            }
            String scheme = value.substring(0, colon).toLowerCase(Locale.ROOT);
            return SAFE_LINK_SCHEMES.contains(scheme) ? value : null;
        }

        private void image(XWPFParagraph p, Element img) {
            Set<UUID> ids = EmailImageUrlResolver.imageIdsIn(img.attr("src"));
            if (ids.size() != 1) {
                throw new DocxConversionException(
                        "The template contains an image that is not from the image library; upload it to the library first.");
            }
            UUID imageId = ids.iterator().next();
            Image image = images.find(imageId).orElseThrow(() -> new DocxConversionException(
                    "The template refers to an image that is not available to your organization: " + imageId));

            int pictureType = switch (String.valueOf(image.contentType()).toLowerCase(Locale.ROOT)) {
                case "image/png" -> XWPFDocument.PICTURE_TYPE_PNG;
                case "image/jpeg", "image/jpg" -> XWPFDocument.PICTURE_TYPE_JPEG;
                case "image/gif" -> XWPFDocument.PICTURE_TYPE_GIF;
                default -> throw new DocxConversionException("Images of type '" + image.contentType()
                        + "' cannot be used in a Word template; use PNG, JPEG or GIF.");
            };

            int[] natural = naturalSize(image.data());
            int[] size = displaySize(img, natural);
            try (ByteArrayInputStream in = new ByteArrayInputStream(image.data())) {
                p.createRun().addPicture(in, pictureType, imageId + extension(pictureType),
                        Units.pixelToEMU(size[0]), Units.pixelToEMU(size[1]));
            } catch (Exception e) {
                throw new DocxConversionException("An image could not be added to the Word document: " + e.getMessage(), e);
            }
        }

        private String extension(int pictureType) {
            return pictureType == XWPFDocument.PICTURE_TYPE_PNG ? ".png"
                    : pictureType == XWPFDocument.PICTURE_TYPE_GIF ? ".gif" : ".jpg";
        }

        private int[] naturalSize(byte[] data) {
            try (ImageInputStream in = ImageIO.createImageInputStream(new ByteArrayInputStream(data))) {
                Iterator<ImageReader> readers = ImageIO.getImageReaders(in);
                if (!readers.hasNext()) {
                    throw new DocxConversionException("An image in the template could not be read.");
                }
                ImageReader reader = readers.next();
                try {
                    reader.setInput(in);
                    return new int[]{reader.getWidth(0), reader.getHeight(0)};
                } finally {
                    reader.dispose();
                }
            } catch (IOException e) {
                throw new DocxConversionException("An image in the template could not be read.", e);
            }
        }

        /** Afmeting uit de editor (width/height-attribuut of -stijl), anders de eigen afmeting; nooit breder dan de pagina. */
        private int[] displaySize(Element img, int[] natural) {
            Integer width = pixels(img.attr("width"));
            Integer height = pixels(img.attr("height"));
            String style = img.attr("style");
            if (width == null) {
                width = pixels(styleValue(style, "width"));
            }
            if (height == null) {
                height = pixels(styleValue(style, "height"));
            }
            double ratio = (double) natural[1] / natural[0];
            int w = width != null ? width : height != null ? (int) Math.round(height / ratio) : natural[0];
            int h = height != null && width != null ? height : (int) Math.round(w * ratio);
            if (w > MAX_IMAGE_WIDTH_PX) {
                h = (int) Math.round(h * ((double) MAX_IMAGE_WIDTH_PX / w));
                w = MAX_IMAGE_WIDTH_PX;
            }
            return new int[]{Math.max(w, 1), Math.max(h, 1)};
        }

        private Integer pixels(String value) {
            if (value == null || value.isBlank() || value.contains("%")) {
                return null;
            }
            Matcher m = NUMBER.matcher(value);
            if (!m.find()) {
                return null;
            }
            double v = Double.parseDouble(m.group(1));
            if (value.trim().toLowerCase(Locale.ROOT).endsWith("pt")) {
                v = v / 0.75;
            }
            return v >= 1 && v <= 10000 ? (int) Math.round(v) : null;
        }

        // ------------------------------------------------------------------------------------------
        // style-attribuut
        // ------------------------------------------------------------------------------------------

        private RunStyle applyStyleAttr(Element el, RunStyle style) {
            String css = el.attr("style");
            if (css.isBlank()) {
                return style;
            }
            RunStyle result = style;
            String family = styleValue(css, "font-family");
            if (family != null) {
                String first = family.split(",")[0].replaceAll("[\"']", "").trim();
                if (!first.isEmpty() && first.matches("[\\p{L}0-9 _.-]{1,60}")) {
                    result = result.withFont(first);
                }
            }
            String size = styleValue(css, "font-size");
            if (size != null) {
                Matcher m = FONT_SIZE.matcher(size.trim());
                if (m.matches()) {
                    double v = Double.parseDouble(m.group(1));
                    double pt = "pt".equals(m.group(2)) ? v : v * 0.75; // px (standaard in CSS) -> pt
                    if (pt >= 4 && pt <= 200) {
                        result = result.withSize(pt);
                    }
                }
            }
            String color = colorHex(styleValue(css, "color"));
            if (color != null) {
                result = result.withColor(color);
            }
            String weight = styleValue(css, "font-weight");
            if (weight != null && (weight.equalsIgnoreCase("bold") || weight.matches("[7-9]00"))) {
                result = result.withBold();
            }
            String fontStyle = styleValue(css, "font-style");
            if (fontStyle != null && fontStyle.equalsIgnoreCase("italic")) {
                result = result.withItalic();
            }
            String decoration = styleValue(css, "text-decoration");
            if (decoration != null && decoration.contains("underline")) {
                result = result.withUnderline();
            }
            if (decoration != null && decoration.contains("line-through")) {
                result = result.withStrike();
            }
            return result;
        }

        private ParagraphAlignment alignOf(Element el) {
            String align = styleValue(el.attr("style"), "text-align");
            if (align == null) {
                align = el.attr("align");
            }
            return switch (align == null ? "" : align.trim().toLowerCase(Locale.ROOT)) {
                case "center" -> ParagraphAlignment.CENTER;
                case "right" -> ParagraphAlignment.RIGHT;
                case "justify" -> ParagraphAlignment.BOTH;
                default -> null;
            };
        }
    }

    // ----------------------------------------------------------------------------------------------
    // Kleine hulpfuncties
    // ----------------------------------------------------------------------------------------------

    /** De waarde van één CSS-eigenschap uit een style-attribuut, of null. */
    static String styleValue(String css, String property) {
        if (css == null || css.isBlank()) {
            return null;
        }
        for (String declaration : css.split(";")) {
            int colon = declaration.indexOf(':');
            if (colon > 0 && declaration.substring(0, colon).trim().equalsIgnoreCase(property)) {
                String value = declaration.substring(colon + 1).trim();
                return value.isEmpty() ? null : value;
            }
        }
        return null;
    }

    /** Een CSS-kleur ({@code #rrggbb}, {@code #rgb}, {@code rgb(...)}) als RRGGBB, of null. */
    static String colorHex(String css) {
        if (css == null) {
            return null;
        }
        String value = css.trim();
        Matcher hex = HEX_COLOR.matcher(value);
        if (hex.matches()) {
            String h = hex.group(1);
            if (h.length() == 3) {
                h = "" + h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
            }
            return h.toUpperCase(Locale.ROOT);
        }
        Matcher rgb = RGB_COLOR.matcher(value);
        if (rgb.matches()) {
            int r = Integer.parseInt(rgb.group(1));
            int g = Integer.parseInt(rgb.group(2));
            int b = Integer.parseInt(rgb.group(3));
            if (r <= 255 && g <= 255 && b <= 255) {
                return String.format("%02X%02X%02X", r, g, b);
            }
        }
        return null;
    }

    private static int attrInt(Element el, String attribute, int fallback) {
        try {
            return Integer.parseInt(el.attr(attribute).trim());
        } catch (NumberFormatException e) {
            return fallback;
        }
    }

    private static int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }
}
