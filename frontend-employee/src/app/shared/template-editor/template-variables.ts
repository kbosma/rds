/**
 * Welke variabelen een template mag gebruiken. De editor is voor e-mails en voor Word-templates dezelfde;
 * alleen de lijst die hij krijgt verschilt. De namen komen overeen met het model dat de backend
 * aanlevert (BookingContext/BookerContext in nl.puurkroatie.rds.docgen.context): een veld dat daar
 * niet bestaat kan hier ook niet staan, anders mislukt het samenvoegen.
 */

export interface TemplateVariable {
  /** i18n-sleutel van het label (ook gebruikt als kolomkop in een herhaalde tabel). */
  labelKey: string;
  /** De tekst die in het document komt, bv. ${booking.bookingNumber}. */
  token: string;
}

export interface TemplateVariableGroup {
  labelKey: string;
  /** Optionele uitleg onder de kop (bv. dat de velden alleen bij een boeking werken). */
  hintKey?: string;
  variables: TemplateVariable[];
}

/** Een tabel waarvan de laatste rij voor elk element van een lijst wordt herhaald. */
export interface RepeatTableDefinition {
  labelKey: string;
  /** Pad naar de lijst in het model, bv. booking.travelers. */
  list: string;
  /** Naam waaronder elk element in de rij beschikbaar is, bv. t. */
  item: string;
  /** De kolommen: kop (labelKey) en wat in de herhaalde rij komt. */
  columns: TemplateVariable[];
}

/**
 * Bedragen: zonder opmaak toont FreeMarker 1250.00 als "1.250"; dit geeft altijd twee decimalen.
 * Bewust dubbele aanhalingstekens: een enkele geeft in een Word-template een syntaxfout bij het samenvoegen.
 */
const money = (path: string): string => '${' + path + '?string("#,##0.00")}';

const bookerFields = (root: string): TemplateVariable[] => [
  { labelKey: 'templateEditor.vars.firstname', token: '${' + root + '.firstname}' },
  { labelKey: 'templateEditor.vars.prefix', token: '${' + root + '.prefix}' },
  { labelKey: 'templateEditor.vars.lastname', token: '${' + root + '.lastname}' },
  { labelKey: 'templateEditor.vars.fullName', token: '${' + root + '.fullName}' },
  { labelKey: 'templateEditor.vars.callsign', token: '${' + root + '.callsign}' },
  { labelKey: 'templateEditor.vars.telephone', token: '${' + root + '.telephone}' },
  { labelKey: 'templateEditor.vars.emailaddress', token: '${' + root + '.emailaddress}' },
  { labelKey: 'templateEditor.vars.gender', token: '${' + root + '.gender}' },
  { labelKey: 'templateEditor.vars.birthdate', token: '${' + root + '.birthdate}' },
  { labelKey: 'templateEditor.vars.initials', token: '${' + root + '.initials}' },
];

/** E-mail: de ontvanger (de boeker, of bij een boeking de hoofdboeker). */
export const PROSPECT_VARIABLES: TemplateVariableGroup = {
  labelKey: 'templateEditor.groups.prospect',
  variables: bookerFields('prospect'),
};

/** De boeking zelf. */
export const BOOKING_VARIABLES: TemplateVariableGroup = {
  labelKey: 'templateEditor.groups.booking',
  variables: [
    { labelKey: 'templateEditor.vars.bookingNumber', token: '${booking.bookingNumber}' },
    { labelKey: 'templateEditor.vars.bookingStatus', token: '${booking.bookingStatus}' },
    { labelKey: 'templateEditor.vars.fromDate', token: '${booking.fromDate}' },
    { labelKey: 'templateEditor.vars.untilDate', token: '${booking.untilDate}' },
    { labelKey: 'templateEditor.vars.totalSum', token: money('booking.totalSum') },
  ],
};

/** Een e-mail kan ook voor een boeking verstuurd worden; die velden werken dan alleen daar. */
export const BOOKING_VARIABLES_FOR_EMAIL: TemplateVariableGroup = {
  ...BOOKING_VARIABLES,
  hintKey: 'templateEditor.groups.bookingOnlyHint',
};

/** Word-template: de hoofdboeker van de boeking. */
export const MAIN_BOOKER_VARIABLES: TemplateVariableGroup = {
  labelKey: 'templateEditor.groups.mainBooker',
  variables: bookerFields('booking.booker'),
};

export const REPEAT_TRAVELERS: RepeatTableDefinition = {
  labelKey: 'templateEditor.repeatTravelers',
  list: 'booking.travelers',
  item: 't',
  columns: [
    { labelKey: 'templateEditor.vars.firstname', token: '${t.firstname}' },
    { labelKey: 'templateEditor.vars.lastname', token: '${t.lastname}' },
    { labelKey: 'templateEditor.vars.birthdate', token: '${t.birthdate}' },
  ],
};

export const REPEAT_BOOKING_LINES: RepeatTableDefinition = {
  labelKey: 'templateEditor.repeatBookingLines',
  list: 'booking.bookingLines',
  item: 'l',
  columns: [
    { labelKey: 'templateEditor.vars.accommodationName', token: '${l.accommodation.name}' },
    { labelKey: 'templateEditor.vars.supplierName', token: '${l.supplier.name}' },
    { labelKey: 'templateEditor.vars.fromDate', token: '${l.fromDate}' },
    { labelKey: 'templateEditor.vars.untilDate', token: '${l.untilDate}' },
    { labelKey: 'templateEditor.vars.price', token: money('l.price') },
  ],
};

export const REPEAT_ACTIVITIES: RepeatTableDefinition = {
  labelKey: 'templateEditor.repeatActivities',
  list: 'booking.bookingActivities',
  item: 'a',
  columns: [
    { labelKey: 'templateEditor.vars.activityName', token: '${a.activityName}' },
    { labelKey: 'templateEditor.vars.fromDate', token: '${a.fromDate}' },
    { labelKey: 'templateEditor.vars.untilDate', token: '${a.untilDate}' },
    { labelKey: 'templateEditor.vars.meetingPoint', token: '${a.meetingPoint}' },
    { labelKey: 'templateEditor.vars.totalPrice', token: money('a.totalPrice') },
  ],
};

/** Beschikbaar voor beide soorten templates: lijsten uit de boeking. */
export const BOOKING_REPEAT_TABLES: RepeatTableDefinition[] = [REPEAT_TRAVELERS, REPEAT_BOOKING_LINES, REPEAT_ACTIVITIES];

/** Voor een e-mail (ontvanger + boeking). */
export const EMAIL_VARIABLE_GROUPS: TemplateVariableGroup[] = [PROSPECT_VARIABLES, BOOKING_VARIABLES_FOR_EMAIL];

/** Voor een Word-template (altijd bij een boeking). */
export const DOCUMENT_VARIABLE_GROUPS: TemplateVariableGroup[] = [BOOKING_VARIABLES, MAIN_BOOKER_VARIABLES];
