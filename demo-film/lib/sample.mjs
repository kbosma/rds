// Een voorbeeldboeking voor filmpjes die er een nodig hebben maar hem niet zelf in beeld aanmaken.

import { api } from './api.mjs';

export const ANNA = { firstname: 'Anna', prefix: 'de', lastname: 'Vries', email: 'anna.devries@example.com' };

/** Anna de Vries met een boeking (reizigers, Villa Oliva, boottocht); geeft { bookingId, bookingNumber }. */
export async function createSampleBooking(token) {
  const booker = await api(token, 'POST', '/bookers', {
    firstname: ANNA.firstname, prefix: ANNA.prefix, lastname: ANNA.lastname, callsign: 'Anna', initials: 'A.',
    telephone: '06 12 34 56 78', emailaddress: ANNA.email, gender: 'vrouw', birthdate: '1986-03-14',
  });
  const booking = await api(token, 'POST', '/bookings', { bookerId: booker.bookerId, bookingStatus: 'aanvraag' });
  for (const t of [
    { firstname: 'Anna', prefix: 'de', lastname: 'Vries', gender: 'vrouw', birthdate: '1986-03-14', initials: 'A.' },
    { firstname: 'Mark', prefix: 'de', lastname: 'Vries', gender: 'man', birthdate: '1984-09-02', initials: 'M.' },
  ]) {
    await api(token, 'POST', '/travelers', { bookingId: booking.bookingId, ...t });
  }
  const [supplier] = await api(token, 'GET', '/suppliers');
  const [villa] = await api(token, 'GET', '/accommodations');
  const [activity] = await api(token, 'GET', '/activities');
  await api(token, 'POST', '/booking-lines', {
    bookingId: booking.bookingId, accommodationId: villa.accommodationId, supplierId: supplier.supplierId,
    fromDate: '2027-07-10', untilDate: '2027-07-24', price: 2450,
  });
  await api(token, 'POST', '/booking-activities', {
    bookingId: booking.bookingId, activityId: activity.activityId, activityDate: '2027-07-14',
    fromTime: '09:30', untilTime: '17:00', meetingPoint: 'Haven van Rovinj', totalPrice: 180,
  });
  return { bookingId: booking.bookingId, bookingNumber: booking.bookingNumber };
}
