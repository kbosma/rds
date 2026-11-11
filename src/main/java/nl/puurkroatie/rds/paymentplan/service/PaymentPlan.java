package nl.puurkroatie.rds.paymentplan.service;

import nl.puurkroatie.rds.mollie.entity.PaymentType;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;

/**
 * Het betalingsschema van een boeking, als pure berekening (geen database):
 * <ul>
 *   <li>ligt de restanttermijn ({@code balanceWeeks} voor vertrek) al achter ons, dan is er één DEFINITIEVE betaling
 *       van het hele bedrag, direct te betalen;</li>
 *   <li>anders een VOORSCHOT ({@code depositPercentage} van het totaal, op twee decimalen afgerond) dat
 *       {@code depositWeeks} voor vertrek vervalt, of direct als dat moment al voorbij is, en een RESTANT
 *       (de rest) dat {@code balanceWeeks} voor vertrek vervalt;</li>
 *   <li>bij een voorschot van 100% vervalt het restant (er valt niets meer te betalen).</li>
 * </ul>
 */
public final class PaymentPlan {

    /** Eén geplande betaling. */
    public record Planned(PaymentType type, BigDecimal amount, LocalDate dueDate) {
    }

    private PaymentPlan() {
    }

    public static List<Planned> calculate(BigDecimal total, LocalDate departure, LocalDate today,
                                          int depositPercentage, int depositWeeks, int balanceWeeks) {
        if (total == null || total.signum() <= 0) {
            throw new IllegalArgumentException("Er is geen totaalbedrag om betalingen voor te maken");
        }
        if (departure == null) {
            throw new IllegalArgumentException("Er is geen vertrekdatum om de betaaltermijnen op te baseren");
        }
        LocalDate balanceDue = departure.minusWeeks(balanceWeeks);
        if (balanceDue.isBefore(today)) {
            return List.of(new Planned(PaymentType.DEFINITIEF, total, today));
        }
        LocalDate depositDue = latest(departure.minusWeeks(depositWeeks), today);
        BigDecimal deposit = total.multiply(BigDecimal.valueOf(depositPercentage))
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        BigDecimal balance = total.subtract(deposit);
        if (balance.signum() <= 0) {
            return List.of(new Planned(PaymentType.VOORSCHOT, total, depositDue));
        }
        return List.of(new Planned(PaymentType.VOORSCHOT, deposit, depositDue),
                new Planned(PaymentType.RESTANT, balance, balanceDue));
    }

    private static LocalDate latest(LocalDate a, LocalDate b) {
        return a.isAfter(b) ? a : b;
    }
}
