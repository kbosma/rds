-- Dwing de 1:M-relatie tussen BOOKING en MOLLIE_PAYMENT af.
--
-- Een MolliePayment hoort bij hoogstens één Booking: losse betalingen
-- (voorschot/restant) en retries leveren elk hun eigen mollie_payment-rij op,
-- maar nooit deelt één betaling meerdere bookings.
--
-- De koppeltabel stond historisch N:M toe (samengestelde PK, geen losse UNIQUE
-- op mollie_payment_id). Deze UNIQUE-constraint garandeert de 1:M-invariant op
-- DB-niveau, terwijl de mollie-module booking-agnostisch blijft: er is bewust
-- GEEN FK van mollie_payment naar booking; de regel wordt bewaakt op de
-- koppeltabel (eigendom van de booking-package).

ALTER TABLE booking_mollie_payment
    ADD CONSTRAINT uq_booking_mollie_payment_mollie_payment_id UNIQUE (mollie_payment_id);
