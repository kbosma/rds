package nl.puurkroatie.rds.demo;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class DemoMailboxTest {

    @Test
    void newestFirst_andLatestPerRecipient() {
        DemoMailbox mailbox = new DemoMailbox();
        mailbox.add("a@x", "anna@example.com", "Offerte", "<p>1</p>", List.of("offerte.pdf"), null);
        mailbox.add("a@x", "bob@example.com", "Iets anders", "<p>2</p>", List.of(), null);
        mailbox.add("noreply@x", "Anna@Example.com", "Inlogcode", "<p>3</p>", List.of(), "123456");

        assertEquals(List.of(3, 2, 1), mailbox.all().stream().map(DemoMailbox.Mail::number).toList());
        assertEquals("123456", mailbox.latest("anna@example.com").orElseThrow().code());
        assertEquals("Iets anders", mailbox.latest("bob@example.com").orElseThrow().subject());
        assertEquals(3, mailbox.latest(null).orElseThrow().number());
        assertTrue(mailbox.latest("niemand@example.com").isEmpty());
    }
}
