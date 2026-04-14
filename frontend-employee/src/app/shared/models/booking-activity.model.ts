export interface BookingActivity {
  bookingActivityId: string;
  bookingId: string;
  activityId: string;
  activityName: string;
  activityType: string;
  fromDate: string;
  untilDate: string;
  meetingPoint: string;
  totalPrice: number;
  createdAt: string;
  createdBy: string;
  modifiedAt: string;
  modifiedBy: string;
  tenantOrganization: string;
}
