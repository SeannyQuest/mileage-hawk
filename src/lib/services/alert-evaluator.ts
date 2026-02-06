// ==========================================
// Alert Evaluation Service
// Compares fresh prices against user alert thresholds
// ==========================================

import { db } from "../db";
import { format } from "date-fns";
import { sendNotification } from "./notification-service";
import type { AlertNotification } from "../types";

interface AlertEvalResult {
  alertsChecked: number;
  alertsTriggered: number;
  notificationsSent: number;
  errors: string[];
}

/**
 * Evaluate all active alerts against the latest prices.
 * Called by /api/cron/check-alerts after scraping + aggregation.
 */
export async function evaluateAlerts(): Promise<AlertEvalResult> {
  const result: AlertEvalResult = {
    alertsChecked: 0,
    alertsTriggered: 0,
    notificationsSent: 0,
    errors: [],
  };

  console.log("[Alerts] Starting alert evaluation");

  try {
    // Get all active alerts with user and route details
    const activeAlerts = await db.userAlert.findMany({
      where: { isActive: true },
      include: {
        user: true,
        route: {
          include: {
            originAirport: true,
            destinationAirport: true,
          },
        },
        airline: true,
      },
    });

    console.log(`[Alerts] Checking ${activeAlerts.length} active alerts`);
    result.alertsChecked = activeAlerts.length;

    for (const alert of activeAlerts) {
      try {
        // Find the best (lowest) price for this alert's criteria
        const priceFilter: Record<string, unknown> = {
          routeId: alert.routeId,
          cabinClass: alert.cabinClass,
          // Only look at prices scraped today
          scrapedAt: {
            gte: new Date(`${format(new Date(), "yyyy-MM-dd")}T00:00:00Z`),
          },
        };

        // If alert is for a specific airline, filter by that
        if (alert.airlineId) {
          priceFilter.airlineId = alert.airlineId;
        }

        const bestPrice = await db.dailyMileagePrice.findFirst({
          where: priceFilter,
          orderBy: { amexPointsEquivalent: "asc" },
          include: { airline: true },
        });

        if (!bestPrice) continue; // No prices found for this route today

        // Check if price is below threshold
        if (bestPrice.amexPointsEquivalent < alert.thresholdPoints) {
          // Check if we already triggered this alert today (prevent duplicates)
          const alreadyTriggered = await db.alertHistory.findFirst({
            where: {
              userAlertId: alert.id,
              triggeredAt: {
                gte: new Date(`${format(new Date(), "yyyy-MM-dd")}T00:00:00Z`),
              },
            },
          });

          if (alreadyTriggered) continue; // Already notified today

          result.alertsTriggered++;

          // Create notification payload for each channel
          for (const channel of alert.alertChannels) {
            const notification: AlertNotification = {
              alertId: alert.id,
              userId: alert.user.id,
              userEmail: alert.user.email,
              userName: alert.user.name,
              userPhone: alert.user.phone,
              channel,
              origin: alert.route.originAirport.code,
              originCity: alert.route.originAirport.city,
              destination: alert.route.destinationAirport.code,
              destinationCity: alert.route.destinationAirport.city,
              cabinClass: alert.cabinClass,
              airlineName: bestPrice.airline.name,
              loyaltyProgram: bestPrice.airline.loyaltyProgram,
              mileageCost: bestPrice.mileageCost,
              amexPointsEquivalent: bestPrice.amexPointsEquivalent,
              thresholdPoints: alert.thresholdPoints,
              travelDate: format(bestPrice.travelDate, "yyyy-MM-dd"),
              bookingUrl: bestPrice.bookingUrl,
              timezone: alert.user.timezone,
              quietHoursStart: alert.user.quietHoursStart,
              quietHoursEnd: alert.user.quietHoursEnd,
            };

            // Record alert trigger in history
            const alertHistoryRecord = await db.alertHistory.create({
              data: {
                userAlertId: alert.id,
                dailyMileagePriceId: bestPrice.id,
                channel,
                notificationSent: false,
              },
            });

            // Send notification via notification service
            console.log(
              `[Alerts] TRIGGERED: ${notification.origin}->${notification.destination} ` +
                `${notification.cabinClass} on ${notification.airlineName}: ` +
                `${notification.amexPointsEquivalent} pts (threshold: ${notification.thresholdPoints})`
            );

            try {
              const sent = await sendNotification(notification);
              // Update the alert history record with send status
              await db.alertHistory.update({
                where: { id: alertHistoryRecord.id },
                data: { notificationSent: sent },
              });
              if (sent) {
                result.notificationsSent++;
                console.log(`[Alerts] Notification sent via ${channel} for alert ${alert.id}`);
              } else {
                console.warn(`[Alerts] Notification via ${channel} failed for alert ${alert.id}`);
              }
            } catch (notifyError) {
              console.error(`[Alerts] Notification error for ${alert.id}:`, notifyError);
              // Mark as failed but don't break the loop
              await db.alertHistory.update({
                where: { id: alertHistoryRecord.id },
                data: { notificationSent: false },
              });
            }
          }

          // Update last triggered timestamp
          await db.userAlert.update({
            where: { id: alert.id },
            data: { lastTriggeredAt: new Date() },
          });
        }
      } catch (alertError) {
        const msg = `Error evaluating alert ${alert.id}: ${alertError instanceof Error ? alertError.message : String(alertError)}`;
        console.error(`[Alerts] ${msg}`);
        result.errors.push(msg);
      }
    }

    console.log(
      `[Alerts] Complete: ${result.alertsTriggered}/${result.alertsChecked} triggered, ${result.notificationsSent} notifications`
    );

    return result;
  } catch (error) {
    console.error("[Alerts] Fatal error:", error);
    throw error;
  }
}
