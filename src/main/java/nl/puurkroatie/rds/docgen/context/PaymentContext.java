package nl.puurkroatie.rds.docgen.context;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Een betaling van de boeking, voor templates ({@code booking.payments}): omschrijving, bedrag, soort
 * ({@code voorschot}, {@code restant}, {@code definitief} of {@code overig}), uiterlijke betaaldatum en huidige status
 * ({@code open}, {@code paid}, ...).
 */
public class PaymentContext {

    private final String description;
    private final BigDecimal amount;
    private final String paymentType;
    private final LocalDate dueDate;
    private final String status;

    public PaymentContext(String description, BigDecimal amount, String paymentType, LocalDate dueDate, String status) {
        this.description = description;
        this.amount = amount;
        this.paymentType = paymentType;
        this.dueDate = dueDate;
        this.status = status;
    }

    public String getDescription() {
        return description;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public String getPaymentType() {
        return paymentType;
    }

    public LocalDate getDueDate() {
        return dueDate;
    }

    public String getStatus() {
        return status;
    }
}
