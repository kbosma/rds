package nl.puurkroatie.rds.mollie.service;

import nl.puurkroatie.rds.auth.entity.Account;
import nl.puurkroatie.rds.auth.entity.Person;
import nl.puurkroatie.rds.auth.repository.AccountRepository;
import nl.puurkroatie.rds.booking.entity.Booker;
import nl.puurkroatie.rds.booking.repository.BookerRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Zet de id in een {@code createdBy}-veld om in een leesbare naam. Dat id is het account van een medewerker
 * of, bij een betaling vanuit het klantportaal, de boeker. Een id zonder bekende naam (verwijderd account) of
 * een lege waarde (door Mollie/het systeem aangemaakt) krijgt geen naam.
 */
@Component
public class CreatedByNameResolver {

    private final AccountRepository accountRepository;
    private final BookerRepository bookerRepository;

    public CreatedByNameResolver(AccountRepository accountRepository, BookerRepository bookerRepository) {
        this.accountRepository = accountRepository;
        this.bookerRepository = bookerRepository;
    }

    @Transactional(readOnly = true)
    public Map<UUID, String> resolve(Collection<UUID> ids) {
        Set<UUID> remaining = ids.stream().filter(Objects::nonNull).collect(Collectors.toCollection(HashSet::new));
        Map<UUID, String> names = new HashMap<>();
        if (remaining.isEmpty()) {
            return names;
        }
        for (Account account : accountRepository.findAllById(remaining)) {
            Person person = account.getPerson();
            names.put(account.getAccountId(), fullName(person.getFirstname(), person.getPrefix(), person.getLastname()));
        }
        remaining.removeAll(names.keySet());
        if (!remaining.isEmpty()) {
            for (Booker booker : bookerRepository.findAllById(remaining)) {
                names.put(booker.getBookerId(), fullName(booker.getFirstname(), booker.getPrefix(), booker.getLastname()));
            }
        }
        return names;
    }

    private static String fullName(String firstname, String prefix, String lastname) {
        return Stream.of(firstname, prefix, lastname)
                .filter(part -> part != null && !part.isBlank())
                .collect(Collectors.joining(" "));
    }
}
