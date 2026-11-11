package nl.puurkroatie.rds.paymentplan.service;

import nl.puurkroatie.rds.mollie.entity.PaymentType;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Het betalingsschema: voorschot (percentage, x weken voor vertrek of direct) en restant (y weken voor vertrek);
 * is ook de restanttermijn al voorbij, dan één definitieve betaling, direct.
 */
class PaymentPlanTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 11, 11);
    private static final BigDecimal TOTAL = new BigDecimal("2000.00");

    private static List<PaymentPlan.Planned> plan(LocalDate departure) {
        return PaymentPlan.calculate(TOTAL, departure, TODAY, 30, 12, 6);
    }

    @Test
    void farAhead_depositAndBalanceOnTheirOwnTerms() {
        LocalDate departure = LocalDate.of(2027, 6, 1);

        List<PaymentPlan.Planned> plan = plan(departure);

        assertEquals(List.of(
                new PaymentPlan.Planned(PaymentType.VOORSCHOT, new BigDecimal("600.00"), departure.minusWeeks(12)),
                new PaymentPlan.Planned(PaymentType.RESTANT, new BigDecimal("1400.00"), departure.minusWeeks(6))), plan);
    }

    @Test
    void depositTermAlreadyPassed_depositIsDueToday() {
        LocalDate departure = TODAY.plusWeeks(8);

        List<PaymentPlan.Planned> plan = plan(departure);

        assertEquals(PaymentType.VOORSCHOT, plan.get(0).type());
        assertEquals(TODAY, plan.get(0).dueDate());
        assertEquals(departure.minusWeeks(6), plan.get(1).dueDate());
    }

    @Test
    void balanceTermAlreadyPassed_oneFinalPaymentDueToday() {
        List<PaymentPlan.Planned> plan = plan(TODAY.plusWeeks(5));

        assertEquals(List.of(new PaymentPlan.Planned(PaymentType.DEFINITIEF, TOTAL, TODAY)), plan);
    }

    @Test
    void departureInThePast_oneFinalPaymentDueToday() {
        assertEquals(PaymentType.DEFINITIEF, plan(LocalDate.of(2026, 7, 20)).get(0).type());
    }

    @Test
    void balanceDueExactlyToday_isStillAnInstalment() {
        List<PaymentPlan.Planned> plan = plan(TODAY.plusWeeks(6));

        assertEquals(2, plan.size());
        assertEquals(TODAY, plan.get(1).dueDate());
    }

    @Test
    void depositIsRoundedToCents_andTheBalanceTakesTheRest() {
        List<PaymentPlan.Planned> plan = PaymentPlan.calculate(new BigDecimal("1000.01"), LocalDate.of(2027, 6, 1), TODAY, 30, 12, 6);

        assertEquals(new BigDecimal("300.00"), plan.get(0).amount());
        assertEquals(new BigDecimal("700.01"), plan.get(1).amount());
    }

    @Test
    void aFullDeposit_leavesNoBalance() {
        List<PaymentPlan.Planned> plan = PaymentPlan.calculate(TOTAL, LocalDate.of(2027, 6, 1), TODAY, 100, 12, 6);

        assertEquals(1, plan.size());
        assertEquals(PaymentType.VOORSCHOT, plan.get(0).type());
        assertEquals(0, TOTAL.compareTo(plan.get(0).amount()));
    }

    @Test
    void withoutTotalOrDeparture_thereIsNoPlan() {
        assertThrows(IllegalArgumentException.class, () -> PaymentPlan.calculate(BigDecimal.ZERO, TODAY, TODAY, 30, 12, 6));
        assertThrows(IllegalArgumentException.class, () -> PaymentPlan.calculate(TOTAL, null, TODAY, 30, 12, 6));
    }
}
