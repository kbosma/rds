export interface BookingActivity {
  bookingActivityId: string;
  bookingId: string;
  activityId: string;
  activityName: string;
  activityType: string;
  /** Eén dag (yyyy-MM-dd); een tot-tijd vóór de van-tijd betekent: eindigt de volgende dag. */
  activityDate: string;
  /** 24-uurs tijd (HH:mm of HH:mm:ss). */
  fromTime: string;
  untilTime: string;
  meetingPoint: string;
  totalPrice: number;
  createdAt: string;
  createdBy: string;
  modifiedAt: string;
  modifiedBy: string;
  tenantOrganization: string;
}
