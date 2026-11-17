package nl.puurkroatie.rds.demo;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * De postbus van het demo-profiel: elke e-mail die de applicatie "verstuurt" komt hier terecht in plaats van bij
 * een echte ontvanger. Alleen in het geheugen; na een herstart is hij leeg.
 */
public class DemoMailbox {

    public record Mail(int number, LocalDateTime receivedAt, String from, String to, String subject, String bodyHtml,
                       List<String> attachmentNames, String code) {
    }

    private final List<Mail> mails = new CopyOnWriteArrayList<>();

    public synchronized Mail add(String from, String to, String subject, String bodyHtml,
                                 List<String> attachmentNames, String code) {
        Mail mail = new Mail(mails.size() + 1, LocalDateTime.now(), from, to, subject, bodyHtml,
                List.copyOf(attachmentNames), code);
        mails.add(mail);
        return mail;
    }

    /** Nieuwste eerst. */
    public List<Mail> all() {
        List<Mail> copy = new ArrayList<>(mails);
        java.util.Collections.reverse(copy);
        return copy;
    }

    public Optional<Mail> find(int number) {
        return mails.stream().filter(m -> m.number() == number).findFirst();
    }

    /** De nieuwste mail aan {@code to} (hoofdletterongevoelig), of de nieuwste in het algemeen als {@code to} leeg is. */
    public Optional<Mail> latest(String to) {
        return all().stream()
                .filter(m -> to == null || to.isBlank() || m.to().equalsIgnoreCase(to))
                .findFirst();
    }
}
