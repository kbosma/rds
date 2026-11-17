package nl.puurkroatie.rds.common;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Wat iemand mag en ziet, volgt uit zijn authorities, nooit uit de naam van zijn rol (docs/voorstel-eigen-rollen.md, §5).
 * Een eigen rol van een organisatie zou anders buiten elke controle vallen. Deze test laat de build falen zodra de
 * backend weer op rolnamen controleert.
 */
class NoRoleNameChecksTest {

    @Test
    void theBackendNeverChecksRoleNames() throws IOException {
        try (Stream<Path> files = Files.walk(Path.of("src/main/java"))) {
            List<String> offenders = files
                    .filter(path -> path.toString().endsWith(".java"))
                    .filter(NoRoleNameChecksTest::checksRoleNames)
                    .map(Path::toString)
                    .toList();
            assertTrue(offenders.isEmpty(), "Controle op rolnaam in plaats van authority in: " + offenders);
        }
    }

    private static boolean checksRoleNames(Path path) {
        try {
            String source = Files.readString(path);
            return source.contains("hasRole(") || source.contains("hasAnyRole(");
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }
}
