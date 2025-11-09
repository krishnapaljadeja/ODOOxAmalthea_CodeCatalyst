import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();


export const autoCheckoutIncompleteAttendance = async () => {
  try {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const incompleteAttendances = await prisma.attendance.findMany({
      where: {
        checkIn: { not: null },
        checkOut: null,
        date: { lte: today }, 
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (incompleteAttendances.length === 0) {
      console.log(
        `[Auto-Checkout] No incomplete attendance records found at ${now.toISOString()}`
      );
      return { processed: 0, updated: 0 };
    }

    console.log(
      `[Auto-Checkout] Found ${
        incompleteAttendances.length
      } incomplete attendance record(s) at ${now.toISOString()}`
    );

    let updatedCount = 0;

    for (const attendance of incompleteAttendances) {
      try {
        const attendanceDate = new Date(attendance.date);
        const checkoutTime = new Date(attendanceDate);
        checkoutTime.setHours(18, 0, 0, 0); // 6 PM

        // If the attendance date is today and it's before 6 PM, don't auto-checkout yet
        const isToday = attendanceDate.toDateString() === today.toDateString();
        if (isToday && now < checkoutTime) {
          console.log(
            `[Auto-Checkout] Skipping ${attendance.employee.employeeId} - today's record, before 6 PM`
          );
          continue;
        }

        const checkInTime = new Date(attendance.checkIn);
        const hoursWorked = (checkoutTime - checkInTime) / (1000 * 60 * 60);

        const status = hoursWorked >= 4 ? "present" : "half_day";

        await prisma.attendance.update({
          where: { id: attendance.id },
          data: {
            checkOut: checkoutTime,
            hoursWorked,
            status,
          },
        });

        updatedCount++;
        console.log(
          `[Auto-Checkout] Auto-checked out ${
            attendance.employee.employeeId
          } (${attendance.employee.firstName} ${
            attendance.employee.lastName
          }) - Date: ${
            attendanceDate.toISOString().split("T")[0]
          }, Hours: ${hoursWorked.toFixed(2)}, Status: ${status}`
        );
      } catch (error) {
        console.error(
          `[Auto-Checkout] Error processing attendance ${attendance.id} for employee ${attendance.employee.employeeId}:`,
          error.message
        );
      }
    }

    console.log(
      `[Auto-Checkout] Completed: ${updatedCount} of ${incompleteAttendances.length} records updated`
    );
    return { processed: incompleteAttendances.length, updated: updatedCount };
  } catch (error) {
    console.error("[Auto-Checkout] Error in auto-checkout process:", error);
    throw error;
  }
};
