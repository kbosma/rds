package nl.puurkroatie.rds.demo;

import java.time.format.DateTimeFormatter;
import java.util.List;

import static org.springframework.web.util.HtmlUtils.htmlEscape;

/** De twee HTML-pagina's van het demo-profiel: de nep-betaalpagina en de postbus. Alle invoer wordt ge-escaped. */
final class DemoPages {

    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm");

    private static final String STYLE = """
            <style>
              * { box-sizing: border-box; }
              body { margin: 0; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; color: #1d2b36;
                     background: #eef2f5; }
              .demo-banner { background: #fff4d6; color: #6b4e00; font-size: 13px; padding: 6px 16px; text-align: center;
                             border-bottom: 1px solid #f0dca0; }
              .card { background: #fff; border: 1px solid #dde4ea; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,.05); }
              button { font: inherit; cursor: pointer; }
            </style>
            """;

    private DemoPages() {
    }

    static String checkout(String id, String description, String amount) {
        return """
                <!doctype html><html lang="nl"><head><meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1"><title>Betalen</title>%s
                <style>
                  .wrap { max-width: 420px; margin: 48px auto; padding: 0 16px; }
                  .card { padding: 28px; }
                  .brand { font-weight: 700; font-size: 20px; margin-bottom: 20px; }
                  .amount { font-size: 34px; font-weight: 700; margin: 4px 0 6px; }
                  .desc { color: #5b6b78; margin-bottom: 22px; }
                  .method { display: flex; align-items: center; gap: 10px; border: 2px solid #0a7cff; border-radius: 10px;
                            padding: 12px 14px; margin-bottom: 22px; font-weight: 600; }
                  .dot { width: 14px; height: 14px; border-radius: 50%%; border: 4px solid #0a7cff; }
                  .pay { width: 100%%; background: #0a7cff; color: #fff; border: 0; border-radius: 10px; padding: 14px; font-size: 16px;
                         font-weight: 600; }
                  .cancel { width: 100%%; background: none; border: 0; color: #5b6b78; margin-top: 10px; padding: 8px; }
                </style></head><body>
                <div class="demo-banner">Demo: dit is een nagebootste betaalpagina. Er wordt geen echt geld overgemaakt.</div>
                <div class="wrap"><div class="card">
                  <div class="brand">Betalen</div>
                  <div class="desc">%s</div>
                  <div class="amount">%s</div>
                  <div class="method"><span class="dot"></span> iDEAL</div>
                  <form method="post" action="%s">
                    <button class="pay" name="result" value="paid" type="submit">Betalen</button>
                    <button class="cancel" name="result" value="canceled" type="submit">Annuleren</button>
                  </form>
                </div></div></body></html>
                """.formatted(STYLE, description, amount, htmlEscape(id));
    }

    static String mailbox(List<DemoMailbox.Mail> mails, DemoMailbox.Mail selected, String to) {
        StringBuilder list = new StringBuilder();
        for (DemoMailbox.Mail mail : mails) {
            boolean active = selected != null && mail.number() == selected.number();
            String href = "?n=" + mail.number() + (to == null || to.isBlank() ? "" : "&to=" + htmlEscape(to));
            list.append("<a class=\"item").append(active ? " active" : "").append("\" href=\"").append(href).append("\">")
                    .append("<div class=\"subj\">").append(htmlEscape(mail.subject())).append("</div>")
                    .append("<div class=\"meta\">").append(htmlEscape(mail.to())).append(" · ")
                    .append(mail.receivedAt().format(TIME)).append("</div></a>");
        }
        if (mails.isEmpty()) {
            list.append("<div class=\"empty\">Nog geen e-mails.</div>");
        }

        String detail;
        if (selected == null) {
            detail = "<div class=\"empty\">Geen e-mail gekozen.</div>";
        } else {
            StringBuilder attachments = new StringBuilder();
            for (String name : selected.attachmentNames()) {
                attachments.append("<span class=\"att\">📎 ").append(htmlEscape(name)).append("</span>");
            }
            detail = "<h1>" + htmlEscape(selected.subject()) + "</h1>"
                    + "<div class=\"hdr\">Van: " + htmlEscape(nullToEmpty(selected.from())) + "<br>Aan: "
                    + htmlEscape(selected.to()) + "</div>"
                    + (attachments.isEmpty() ? "" : "<div class=\"atts\">" + attachments + "</div>")
                    + "<iframe class=\"body\" sandbox srcdoc=\"" + htmlEscape(nullToEmpty(selected.bodyHtml())) + "\"></iframe>";
        }

        String title = to == null || to.isBlank() ? "Postbus" : "Postbus van " + htmlEscape(to);
        return """
                <!doctype html><html lang="nl"><head><meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1"><title>%s</title>%s
                <style>
                  .top { padding: 14px 20px; font-weight: 700; font-size: 18px; background: #fff; border-bottom: 1px solid #dde4ea; }
                  .grid { display: grid; grid-template-columns: 340px 1fr; gap: 16px; padding: 16px; height: calc(100vh - 92px); }
                  .list { overflow: auto; padding: 6px; }
                  .item { display: block; padding: 10px 12px; border-radius: 8px; color: inherit; text-decoration: none; }
                  .item:hover { background: #f2f6f9; }
                  .item.active { background: #e3efff; }
                  .subj { font-weight: 600; font-size: 14px; }
                  .meta { color: #5b6b78; font-size: 12px; margin-top: 2px; }
                  .detail { padding: 20px 24px; overflow: auto; display: flex; flex-direction: column; }
                  h1 { font-size: 20px; margin: 0 0 8px; }
                  .hdr { color: #5b6b78; font-size: 13px; margin-bottom: 10px; }
                  .atts { margin-bottom: 10px; }
                  .att { display: inline-block; background: #f2f6f9; border-radius: 6px; padding: 4px 8px; font-size: 13px; margin-right: 6px; }
                  .body { flex: 1; width: 100%%; min-height: 360px; border: 1px solid #e6ecf0; border-radius: 8px; background: #fff; }
                  .empty { color: #5b6b78; padding: 16px; }
                </style></head><body>
                <div class="demo-banner">Demo: nagebootste postbus. Deze e-mails zijn niet echt verstuurd.</div>
                <div class="top">%s</div>
                <div class="grid"><div class="card list">%s</div><div class="card detail">%s</div></div>
                </body></html>
                """.formatted(title, STYLE, title, list, detail);
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }
}
