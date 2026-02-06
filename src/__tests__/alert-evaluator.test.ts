import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all external dependencies before imports
// vi.mock factories are hoisted — cannot reference outer variables
vi.mock("@prisma/client", () => ({
  PrismaClient: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    userAlert: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    dailyMileagePrice: {
      findFirst: vi.fn(),
    },
    alertHistory: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/services/notification-service", () => ({
  sendNotification: vi.fn(),
}));

import { evaluateAlerts } from "@/lib/services/alert-evaluator";
import { db } from "@/lib/db";
import { sendNotification } from "@/lib/services/notification-service";

// Cast mocked imports for type safety
const mockDb = vi.mocked(db);
const mockSendNotification = vi.mocked(sendNotification);

// Helper to build a mock alert with all relations
function makeAlert(overrides: Record<string, unknown> = {}) {
  return {
    id: "alert-1",
    userId: "user-1",
    routeId: "route-1",
    cabinClass: "BUSINESS",
    airlineId: null,
    thresholdPoints: 60000,
    alertChannels: ["EMAIL"],
    isActive: true,
    lastTriggeredAt: null,
    user: {
      id: "user-1",
      email: "test@example.com",
      name: "Test User",
      phone: "+15551234567",
      timezone: "America/Chicago",
      quietHoursStart: 22,
      quietHoursEnd: 7,
    },
    route: {
      originAirport: { code: "AUS", city: "Austin" },
      destinationAirport: { code: "LHR", city: "London" },
    },
    airline: null,
    ...overrides,
  };
}

function makePrice(overrides: Record<string, unknown> = {}) {
  return {
    id: "price-1",
    routeId: "route-1",
    airlineId: "airline-1",
    cabinClass: "BUSINESS",
    mileageCost: 50000,
    amexPointsEquivalent: 50000,
    travelDate: new Date("2026-04-15"),
    bookingUrl: "https://example.com/book",
    airline: {
      name: "British Airways",
      loyaltyProgram: "Executive Club",
    },
    ...overrides,
  };
}

describe("evaluateAlerts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSendNotification.mockResolvedValue(true);
  });

  it("returns zeros when no active alerts exist", async () => {
    mockDb.userAlert.findMany.mockResolvedValue([]);

    const result = await evaluateAlerts();

    expect(result.alertsChecked).toBe(0);
    expect(result.alertsTriggered).toBe(0);
    expect(result.notificationsSent).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it("skips alerts with no matching prices today", async () => {
    mockDb.userAlert.findMany.mockResolvedValue([makeAlert()] as any);
    mockDb.dailyMileagePrice.findFirst.mockResolvedValue(null);

    const result = await evaluateAlerts();

    expect(result.alertsChecked).toBe(1);
    expect(result.alertsTriggered).toBe(0);
    expect(result.notificationsSent).toBe(0);
  });

  it("skips alerts when price is above threshold", async () => {
    mockDb.userAlert.findMany.mockResolvedValue([
      makeAlert({ thresholdPoints: 40000 }),
    ] as any);
    // Price is 50K, threshold is 40K → not triggered
    mockDb.dailyMileagePrice.findFirst.mockResolvedValue(makePrice() as any);

    const result = await evaluateAlerts();

    expect(result.alertsChecked).toBe(1);
    expect(result.alertsTriggered).toBe(0);
  });

  it("triggers alert when price drops below threshold", async () => {
    const alert = makeAlert({ thresholdPoints: 60000 });
    mockDb.userAlert.findMany.mockResolvedValue([alert] as any);
    mockDb.dailyMileagePrice.findFirst.mockResolvedValue(makePrice() as any); // 50K < 60K
    mockDb.alertHistory.findFirst.mockResolvedValue(null); // not already triggered
    mockDb.alertHistory.create.mockResolvedValue({ id: "history-1" } as any);
    mockDb.alertHistory.update.mockResolvedValue({} as any);
    mockDb.userAlert.update.mockResolvedValue({} as any);

    const result = await evaluateAlerts();

    expect(result.alertsTriggered).toBe(1);
    expect(result.notificationsSent).toBe(1);
    expect(mockSendNotification).toHaveBeenCalledTimes(1);
  });

  it("prevents duplicate alerts (already triggered today)", async () => {
    mockDb.userAlert.findMany.mockResolvedValue([makeAlert()] as any);
    mockDb.dailyMileagePrice.findFirst.mockResolvedValue(makePrice() as any);
    // Already triggered today
    mockDb.alertHistory.findFirst.mockResolvedValue({ id: "existing-history" } as any);

    const result = await evaluateAlerts();

    expect(result.alertsTriggered).toBe(0);
    expect(result.notificationsSent).toBe(0);
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it("sends notifications for each channel", async () => {
    const alert = makeAlert({
      alertChannels: ["EMAIL", "SMS", "PUSH"],
    });
    mockDb.userAlert.findMany.mockResolvedValue([alert] as any);
    mockDb.dailyMileagePrice.findFirst.mockResolvedValue(makePrice() as any);
    mockDb.alertHistory.findFirst.mockResolvedValue(null);
    mockDb.alertHistory.create.mockResolvedValue({ id: "history-1" } as any);
    mockDb.alertHistory.update.mockResolvedValue({} as any);
    mockDb.userAlert.update.mockResolvedValue({} as any);

    const result = await evaluateAlerts();

    expect(result.alertsTriggered).toBe(1);
    expect(result.notificationsSent).toBe(3);
    expect(mockSendNotification).toHaveBeenCalledTimes(3);

    // Verify channels were sent correctly
    const channels = mockSendNotification.mock.calls.map(
      (call) => (call[0] as any).channel
    );
    expect(channels).toContain("EMAIL");
    expect(channels).toContain("SMS");
    expect(channels).toContain("PUSH");
  });

  it("passes timezone and quiet hours fields in notification payload", async () => {
    const alert = makeAlert({
      user: {
        id: "user-1",
        email: "test@example.com",
        name: "Test User",
        phone: "+15551234567",
        timezone: "America/New_York",
        quietHoursStart: 23,
        quietHoursEnd: 6,
      },
    });
    mockDb.userAlert.findMany.mockResolvedValue([alert] as any);
    mockDb.dailyMileagePrice.findFirst.mockResolvedValue(makePrice() as any);
    mockDb.alertHistory.findFirst.mockResolvedValue(null);
    mockDb.alertHistory.create.mockResolvedValue({ id: "history-1" } as any);
    mockDb.alertHistory.update.mockResolvedValue({} as any);
    mockDb.userAlert.update.mockResolvedValue({} as any);

    await evaluateAlerts();

    expect(mockSendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        timezone: "America/New_York",
        quietHoursStart: 23,
        quietHoursEnd: 6,
      })
    );
  });

  it("updates lastTriggeredAt on the alert", async () => {
    const alert = makeAlert();
    mockDb.userAlert.findMany.mockResolvedValue([alert] as any);
    mockDb.dailyMileagePrice.findFirst.mockResolvedValue(makePrice() as any);
    mockDb.alertHistory.findFirst.mockResolvedValue(null);
    mockDb.alertHistory.create.mockResolvedValue({ id: "history-1" } as any);
    mockDb.alertHistory.update.mockResolvedValue({} as any);
    mockDb.userAlert.update.mockResolvedValue({} as any);

    await evaluateAlerts();

    expect(mockDb.userAlert.update).toHaveBeenCalledWith({
      where: { id: "alert-1" },
      data: { lastTriggeredAt: expect.any(Date) },
    });
  });

  it("handles notification send failure gracefully", async () => {
    const alert = makeAlert();
    mockDb.userAlert.findMany.mockResolvedValue([alert] as any);
    mockDb.dailyMileagePrice.findFirst.mockResolvedValue(makePrice() as any);
    mockDb.alertHistory.findFirst.mockResolvedValue(null);
    mockDb.alertHistory.create.mockResolvedValue({ id: "history-1" } as any);
    mockDb.alertHistory.update.mockResolvedValue({} as any);
    mockDb.userAlert.update.mockResolvedValue({} as any);
    mockSendNotification.mockResolvedValue(false); // notification fails

    const result = await evaluateAlerts();

    expect(result.alertsTriggered).toBe(1);
    expect(result.notificationsSent).toBe(0); // not counted as sent
    expect(mockDb.alertHistory.update).toHaveBeenCalledWith({
      where: { id: "history-1" },
      data: { notificationSent: false },
    });
  });

  it("handles notification exception gracefully", async () => {
    const alert = makeAlert();
    mockDb.userAlert.findMany.mockResolvedValue([alert] as any);
    mockDb.dailyMileagePrice.findFirst.mockResolvedValue(makePrice() as any);
    mockDb.alertHistory.findFirst.mockResolvedValue(null);
    mockDb.alertHistory.create.mockResolvedValue({ id: "history-1" } as any);
    mockDb.alertHistory.update.mockResolvedValue({} as any);
    mockDb.userAlert.update.mockResolvedValue({} as any);
    mockSendNotification.mockRejectedValue(new Error("Network error"));

    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await evaluateAlerts();

    expect(result.alertsTriggered).toBe(1);
    expect(result.notificationsSent).toBe(0);
    expect(mockDb.alertHistory.update).toHaveBeenCalledWith({
      where: { id: "history-1" },
      data: { notificationSent: false },
    });

    vi.restoreAllMocks();
  });

  it("evaluates multiple alerts independently", async () => {
    const alert1 = makeAlert({ id: "alert-1", thresholdPoints: 60000 });
    const alert2 = makeAlert({ id: "alert-2", thresholdPoints: 40000 });
    mockDb.userAlert.findMany.mockResolvedValue([alert1, alert2] as any);

    // Both get the same price (50K)
    mockDb.dailyMileagePrice.findFirst.mockResolvedValue(makePrice() as any);
    mockDb.alertHistory.findFirst.mockResolvedValue(null);
    mockDb.alertHistory.create.mockResolvedValue({ id: "history-1" } as any);
    mockDb.alertHistory.update.mockResolvedValue({} as any);
    mockDb.userAlert.update.mockResolvedValue({} as any);

    const result = await evaluateAlerts();

    // alert1 triggers (50K < 60K), alert2 does not (50K >= 40K)
    expect(result.alertsChecked).toBe(2);
    expect(result.alertsTriggered).toBe(1);
  });

  it("filters by airlineId when alert specifies one", async () => {
    const alert = makeAlert({ airlineId: "airline-ba" });
    mockDb.userAlert.findMany.mockResolvedValue([alert] as any);
    mockDb.dailyMileagePrice.findFirst.mockResolvedValue(makePrice() as any);
    mockDb.alertHistory.findFirst.mockResolvedValue(null);
    mockDb.alertHistory.create.mockResolvedValue({ id: "history-1" } as any);
    mockDb.alertHistory.update.mockResolvedValue({} as any);
    mockDb.userAlert.update.mockResolvedValue({} as any);

    await evaluateAlerts();

    // Verify the price query included the airlineId filter
    expect(mockDb.dailyMileagePrice.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          airlineId: "airline-ba",
        }),
      })
    );
  });

  it("records alert history before sending notification", async () => {
    const alert = makeAlert();
    mockDb.userAlert.findMany.mockResolvedValue([alert] as any);
    mockDb.dailyMileagePrice.findFirst.mockResolvedValue(makePrice() as any);
    mockDb.alertHistory.findFirst.mockResolvedValue(null);
    mockDb.alertHistory.create.mockResolvedValue({ id: "history-1" } as any);
    mockDb.alertHistory.update.mockResolvedValue({} as any);
    mockDb.userAlert.update.mockResolvedValue({} as any);

    await evaluateAlerts();

    // History should be created before notification is sent
    const createCallOrder = mockDb.alertHistory.create.mock.invocationCallOrder[0];
    const sendCallOrder = mockSendNotification.mock.invocationCallOrder[0];
    expect(createCallOrder).toBeLessThan(sendCallOrder);
  });

  it("populates notification with correct route and price data", async () => {
    const alert = makeAlert({
      thresholdPoints: 80000, // above the 75K price so alert triggers
      route: {
        originAirport: { code: "DFW", city: "Dallas" },
        destinationAirport: { code: "NRT", city: "Tokyo" },
      },
    });
    const price = makePrice({
      mileageCost: 75000,
      amexPointsEquivalent: 75000,
      airline: { name: "ANA", loyaltyProgram: "ANA Mileage Club" },
    });
    mockDb.userAlert.findMany.mockResolvedValue([alert] as any);
    mockDb.dailyMileagePrice.findFirst.mockResolvedValue(price as any);
    mockDb.alertHistory.findFirst.mockResolvedValue(null);
    mockDb.alertHistory.create.mockResolvedValue({ id: "history-1" } as any);
    mockDb.alertHistory.update.mockResolvedValue({} as any);
    mockDb.userAlert.update.mockResolvedValue({} as any);

    await evaluateAlerts();

    expect(mockSendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        origin: "DFW",
        originCity: "Dallas",
        destination: "NRT",
        destinationCity: "Tokyo",
        airlineName: "ANA",
        loyaltyProgram: "ANA Mileage Club",
        mileageCost: 75000,
        amexPointsEquivalent: 75000,
      })
    );
  });
});
